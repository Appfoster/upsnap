<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\IncidentsAsset;
use appfoster\upsnap\Constants;
use Craft;
use yii\web\Response;
use appfoster\upsnap\Upsnap;

class IncidentsController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        IncidentsAsset::register($this->view);
    }

    /**
     * Render the incidents listing page.
     * Passes the monitors list server-side so the page can pre-populate
     * the monitor <select> without a loading flash.
     *
     * GET upsnap/incidents
     */
    public function actionIndex(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $settingsService->validateApiKey();

        $userDetails = null;
        if ($settingsService->getApiKey()) {
            $userDetails = $settingsService->getUserDetails();
        }

        // Pre-fetch monitors for the server-side <select> seed
        $monitors = [];
        try {
            $monitorsEndpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['list'];
            $monitorsResponse = Upsnap::$plugin->apiService->get($monitorsEndpoint);
            if (isset($monitorsResponse['status']) && $monitorsResponse['status'] === 'success') {
                $monitors = $monitorsResponse['data'] ?? [];
            }
        } catch (\Throwable $e) {
            Craft::error('Failed to pre-fetch monitors for incidents page: ' . $e->getMessage(), __METHOD__);
        }

        $variables = [
            'title' => Constants::SUBNAV_ITEM_INCIDENTS['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_INCIDENTS['key'],
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::UPSNAP_DASHBOARD_URL,
            'monitors' => $monitors,
            'userDetails' => $userDetails,
        ];

        return $this->renderTemplate('upsnap/incidents/_index', $variables);
    }

    /**
     * Stream a CSV or PDF export.
     */
    public function actionExport(): Response
    {
        $request   = Craft::$app->getRequest();
        $monitorId = $request->getQueryParam('monitorId');
        $fileType  = $request->getQueryParam('file_type', 'csv');

        if (!$monitorId) {
            return $this->asJson(['success' => false, 'message' => 'monitorId is required.']);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['export'];

        $params = array_filter([
            'monitor_id'  => $monitorId,
            'start_time' => $request->getQueryParam('start_time'),
            'end_time'   => $request->getQueryParam('end_time'),
            'type'       => $request->getQueryParam('type'),
            'search'     => $request->getQueryParam('search'),
            'region'     => $request->getQueryParam('region'),
            'file_type'  => $fileType,
        ], fn($v) => $v !== null && $v !== '');

        $accept = $fileType === 'pdf' ? 'application/pdf' : 'text/csv';

        try {
            $raw = Upsnap::$plugin->apiService->getRaw($endpoint, $params, $accept);

            $craftResponse = Craft::$app->getResponse();
            $craftResponse->format = \yii\web\Response::FORMAT_RAW;
            $craftResponse->headers->set('Content-Type',        $raw['contentType']);
            $craftResponse->headers->set('Content-Disposition', $raw['contentDisposition']);
            $craftResponse->data = $raw['body'];

            return $craftResponse;
        } catch (\Throwable $e) {
            Craft::error('Incidents export failed: ' . $e->getMessage(), __METHOD__);
            return $this->asJson(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Lists the incidents for a given monitor, with pagination and filtering.
     */
    public function actionList(): Response
    {
        $request = Craft::$app->getRequest();

        // Normalise time_range: the external API requires uppercase (e.g. '7D', '30D').
        // The Twig select emits '7D' and '1M'; map '1M' → '30D' for API compatibility.
        $rawTimeRange = $request->getQueryParam('time_range', '24h');
        $timeRange = match(strtolower($rawTimeRange)) {
            '7d'  => '7D',
            '30d' => '30D',
            '1m'  => '30D',
            '90d' => '90D',
            default => $rawTimeRange,
        };

        $params = array_filter([
            'monitorId'      => $request->getQueryParam('monitorId'),
            'time_range'     => $timeRange,
            'page'           => $request->getQueryParam('page', 1),
            'page_size'      => $request->getQueryParam('page_size', 20),
            'check_type'     => $request->getQueryParam('check_type'),
            'search'         => $request->getQueryParam('search'),
            'sort_by'        => $request->getQueryParam('sort_by', 'timestamp'),
            'sort_order'     => $request->getQueryParam('sort_order', 'desc'),
            'region'         => $request->getQueryParam('region'),
            'include_paused' => $request->getQueryParam('include_paused'),
        ], fn($v) => $v !== null && $v !== '');

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['incidents'];

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);

            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(Craft::t('upsnap', 'Something went wrong while fetching incidents. Please try again.'));
            }

            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch incidents.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success'    => true,
                'message'    => Craft::t('upsnap', 'Incidents fetched successfully.'),
                'data'       => $response['data'] ?? [],
                'pagination' => $response['pagination'] ?? $response['meta'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error('Incidents fetch failed: ' . $e->getMessage(), __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
