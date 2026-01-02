<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\DashboardAsset;
use appfoster\upsnap\assetbundles\StatusPageAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;
use appfoster\upsnap\Upsnap;
use yii\web\NotFoundHttpException;

use yii\web\Response;
use Craft;

class StatusPageController extends BaseController
{
    public $service;
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        StatusPageAsset::register($this->view);
        $this->service = new HealthCheckService($this);
    }

    /**
     * Dashboard index
     */
    public function actionIndex(): \yii\web\Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $settingsService->validateApiKey();
        $userDetails = null;
        if($settingsService->getApiKey()) {
            $userDetails = $settingsService->getUserDetails();
        }

        $variables = [
            'success' => true,
            'title' => Constants::SUBNAV_ITEM_STATUS_PAGE['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_DASHBOARD['key'],
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::UPSNAP_DASHBOARD_URL,
            'userDetails' => $userDetails
        ];

        return $this->renderTemplate('upsnap/status-page/_index', $variables);
    }

    public function actionList(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['list'];

        try {
            $response = [];
            $response = Upsnap::$plugin->apiService->get($endpoint);

            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(Craft::t('upsnap', 'Something went wrong while fetching status page. Please try again.'));
            }

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch status page.');

                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Status page fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Status page fetch failed: {$e->getMessage()}", __METHOD__);
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function actionNew(?string $statusPageId = null): Response
    {
        $this->requireCpRequest();
        $service = Upsnap::getInstance()->settingsService;
        $userDetails = null;
        if ($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }
        $variables = [
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'userDetails' => $userDetails,
        ];

        if ($statusPageId) {
            // EDIT MODE
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['detail'] . '/' . $statusPageId;

            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception("Unable to fetch status page details.");
            }

            $statusPage = $response['data']['status_page'];

            if (!$statusPage) {
                throw new NotFoundHttpException("Status page not found");
            }

            $variables['mode'] = 'edit';
            $variables['statusPage'] = $statusPage;
            $variables['title'] = "Edit Status Page";
        } else {
            // ADD MODE
            $variables['mode'] = 'add';
            $variables['statusPage'] = null;
            $variables['title'] = "Add Status Page";
        }

        return $this->renderTemplate('upsnap/status-page/new/_index', $variables);
    }

    public function actionSave(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        try {
            $payload = $request->getRequiredBodyParam('payload');

            $payloadArray = json_decode($payload, true);
            if (!$payloadArray) {
                throw new \Exception('Invalid JSON payload.');
            }

            $statusPageId = $payloadArray['statusPageId'] ?? null;

            $endpoint = $statusPageId
                ? Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['update'] . '/' . $statusPageId
                : Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['create'];

            $response = $statusPageId
                ? Upsnap::$plugin->apiService->put($endpoint, $payloadArray)
                : Upsnap::$plugin->apiService->post($endpoint, $payloadArray);

            if (($response['status'] ?? null) !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to save status page.');
            }

            return $this->asJson([
                'success' => true,
                'message' => $statusPageId
                    ? 'Status page updated successfully.'
                    : 'Status page created successfully.',
                'data' => $response['data']['status_page'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Status page save failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function actionDelete(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $request->getBodyParam('statusPageId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Status Page ID is required.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['delete'];

        try {
            $response = Upsnap::$plugin->apiService->delete("{$endpoint}/{$id}");

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to delete status page.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Status page deleted successfully.'),
            ]);
        } catch (\Throwable $e) {
            Craft::error("Status page delete failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function actionResetShareableId(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $request->getBodyParam('statusPageId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Status Page ID is required.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['list'];

        try {
            $response = Upsnap::$plugin->apiService->post("{$endpoint}/{$id}/reset");

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to reset status page shareable id.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Status page shareable id reset successfully.'),
            ]);
        } catch (\Throwable $e) {
            Craft::error("Status page shareable id reset failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
