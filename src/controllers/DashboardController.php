<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\DashboardAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;
use appfoster\upsnap\Upsnap;
use Craft;
use yii\web\Response;

class DashboardController extends BaseController
{
    public $service;
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        DashboardAsset::register($this->view);
        $this->service = new HealthCheckService($this);
    }

    // Action Methods
    // =========================================================================

    /**
     * Dashboard index
     */
    public function actionIndex(): \yii\web\Response
    {
        $request = Craft::$app->getRequest();
        $url = Upsnap::getMonitoringUrl();
        $settingsService = Upsnap::$plugin->settingsService;
        $settingsService->validateApiKey();
        $primaryMonitorRequirement = $settingsService->getPrimaryMonitorRequirement();
        $primaryMonitorNeedsSelection =
            ($primaryMonitorRequirement['canValidate'] ?? false) === true
            && ($primaryMonitorRequirement['requiresSelection'] ?? false) === true;

        $primaryMonitorId = $settingsService->getMonitorId();
        $requestedMonitorId = (string)$request->getQueryParam('monitor_id', '');

        $monitorOptionsResult = $settingsService->getPrimaryMonitorOptions();
        $monitorOptions = $monitorOptionsResult['monitorOptions'] ?? [];
        $monitorIds = array_map(static fn(array $option): string => (string)($option['id'] ?? ''), $monitorOptions);

        $activeMonitorId = $primaryMonitorId;
        if ($requestedMonitorId !== '' && in_array($requestedMonitorId, $monitorIds, true)) {
            $activeMonitorId = $requestedMonitorId;
        }

        $monitorData = null;
        if ($activeMonitorId) {
            $context = $this->resolveMonitorContext((string)$activeMonitorId);
            $monitorData = $context['monitorData'];
            $url = $context['monitorUrl'] ?: $url;
        }

        // Fetch recent incidents
        $incidents = [];
        try {
            $incidentsResponse = Upsnap::$plugin->apiService->getMonitorIncidents('7D', 1, 20);
            if (isset($incidentsResponse['status']) && $incidentsResponse['status'] === 'success') {
                $incidents = $incidentsResponse['data']['incidents'] ?? [];
            }
        } catch (\Throwable $e) {
            Craft::error("Incidents fetch failed: {$e->getMessage()}", __METHOD__);
        }

        $variables = [
            'success' => true,
            'title' => Constants::SUBNAV_ITEM_DASHBOARD['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_DASHBOARD['key'],
            'url' => $url,
            'monitorId' => $activeMonitorId,
            'monitorData' => $monitorData,
            'monitorOptions' => $monitorOptions,
            'primaryMonitorId' => $primaryMonitorId,
            'incidents' => $incidents,
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::getWebAppUrl('webapp'),
            'primaryMonitorNeedsSelection' => $primaryMonitorNeedsSelection,
            'primaryMonitorRequirement' => $primaryMonitorRequirement,
        ];

        if (!$url) {
            $variables['success'] = false;
            $variables['message'] = 'Monitoring URL is not set. Please configure it in the settings.';
        }

        return $this->renderTemplate('upsnap/_index', $variables);
    }

    /**
     * Fetch selected monitor context for dashboard monitor switching.
     */
    public function actionMonitorContext(): Response
    {
        $request = Craft::$app->getRequest();
        $settingsService = Upsnap::$plugin->settingsService;

        $settingsService->validateApiKey();

        $monitorId = (string)($request->getBodyParam('monitor_id') ?? $request->getQueryParam('monitor_id', ''));
        if ($monitorId === '') {
            return $this->asJson([
                'success' => false,
                'message' => 'Missing monitor_id.',
            ]);
        }

        $monitorOptionsResult = $settingsService->getPrimaryMonitorOptions();
        $monitorOptions = $monitorOptionsResult['monitorOptions'] ?? [];
        $isAllowed = in_array($monitorId, array_map(static fn(array $option): string => (string)($option['id'] ?? ''), $monitorOptions), true);

        if (!$isAllowed) {
            return $this->asJson([
                'success' => false,
                'message' => 'Invalid monitor_id.',
            ]);
        }

        $context = $this->resolveMonitorContext($monitorId);
        if (!$context['monitorData']) {
            return $this->asJson([
                'success' => false,
                'message' => 'Unable to load selected monitor.',
            ]);
        }

        return $this->asJson([
            'success' => true,
            'message' => 'Monitor context fetched successfully.',
            'data' => [
                'monitorId' => $monitorId,
                'monitorData' => $context['monitorData'],
                'monitorUrl' => $context['monitorUrl'],
            ],
        ]);
    }

    /**
     * Resolve monitor details + settings and derive monitor URL for dashboard rendering.
     */
    private function resolveMonitorContext(string $monitorId): array
    {
        $monitorData = null;
        $monitorUrl = '';

        try {
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;
            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (isset($response['status']) && $response['status'] === 'success') {
                $monitorData = $response['data']['monitor'] ?? null;

                $settingsEndpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['settings'];
                $settingsResponse = Upsnap::$plugin->apiService->get($settingsEndpoint, ['id' => $monitorId]);

                $config = [];
                if (isset($settingsResponse['status']) && $settingsResponse['status'] === 'success') {
                    $config = $settingsResponse['data']['settings'] ?? [];
                }

                if ($monitorData) {
                    $monitorData['config'] = $config;

                    $serviceType = $monitorData['service_type'] ?? null;
                    $meta = $config['meta'] ?? [];

                    if ($serviceType === 'port') {
                        $host = $meta['host'] ?? '';
                        $port = $meta['port'] ?? '';
                        $monitorUrl = $host && $port ? "$host:$port" : ($host ?: $port);
                    } else {
                        $monitorUrl = (string)($meta['url'] ?? '');
                    }
                }
            }
        } catch (\Throwable $e) {
            Craft::error("Monitor context fetch failed: {$e->getMessage()}", __METHOD__);
        }

        return [
            'monitorData' => $monitorData,
            'monitorUrl' => $monitorUrl,
        ];
    }
}