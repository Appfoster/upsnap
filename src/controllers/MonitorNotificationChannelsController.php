<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;
use Craft;
use craft\web\Controller;
use yii\web\Response;

class MonitorNotificationChannelsController extends Controller
{
    protected array|bool|int $allowAnonymous = false;

    private $apiService;
    private $settingsService;

    public function __construct($id, $module, $config = [])
    {
        parent::__construct($id, $module, $config);
        $this->apiService = Upsnap::$plugin->apiService;
        $this->settingsService =  Upsnap::$plugin->settingsService;
    }

    // ✅ Create Notification Channel
    public function actionCreate(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $monitorId = $this->settingsService->getMonitorId();
        $type = $request->getBodyParam('type');
        $label = $request->getBodyParam('label');
        $config = $request->getBodyParam('config', []);

        if (!$type || !$label || empty($config)) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Type, label, and config are required.'),
            ]);
        }

        $endpointTemplate = Constants::MICROSERVICE_ENDPOINTS['monitors']['notification_channels']['create'];
        $endpoint = str_replace('{monitorId}', $monitorId, $endpointTemplate);

        try {
            $payload = [
                'channel_type' => $type,
                'name' => $label,
                'config' => $config,
            ];

            $response = $this->apiService->post($endpoint, $payload);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to create notification channel.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Notification channel added successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Notification channel creation failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    // ✅ Update Notification Channel
    public function actionUpdate(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $monitorId = $this->settingsService->getMonitorId();
        $channelId = $request->getBodyParam('channelId');
        $label = $request->getBodyParam('label');
        $config = $request->getBodyParam('config', []);

        if (!$monitorId || !$channelId || !$label || empty($config)) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID, Channel ID, label, and config are required.'),
            ]);
        }

        $endpointTemplate = Constants::MICROSERVICE_ENDPOINTS['monitors']['notification_channels']['update'];
        $endpoint = str_replace(['{monitorId}', '{channelId}'], [$monitorId, $channelId], $endpointTemplate);

        try {
            $payload = [
                'name' => $label,
                'config' => $config,
            ];

            $response = $this->apiService->put($endpoint, $payload);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to update notification channel.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Notification channel updated successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Notification channel update failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    // ✅ List Notification Channels
    public function actionList(): Response
    {
        $monitorId = $this->settingsService->getMonitorId();

        if (!$monitorId) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID is required to list notification channels.'),
            ]);
        }

        $endpointTemplate = Constants::MICROSERVICE_ENDPOINTS['monitors']['integrations']['list'];
        $endpoint = str_replace('{monitorId}', $monitorId, $endpointTemplate);

        try {
            $response = $this->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                Craft::error("Notification channels fetch failed: " . json_encode($response), __METHOD__);
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch notification channels.');

                if (stripos($errorMsg, 'invalid authentication token') !== false) {
                    $errorMsg = Craft::t(
                        'upsnap',
                        'The API token seems to be invalid (it might have expired, been suspended, or deleted). Please add a new API token to be able to list, add, or update notification channels.'
                    );
                }

                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'User notification channels fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Notification channels fetch failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => []
            ]);
        }
    }
}
