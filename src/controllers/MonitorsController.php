<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\MonitorsAsset;
use appfoster\upsnap\Constants;
use Craft;
use craft\web\Controller;
use yii\web\Response;
use appfoster\upsnap\Upsnap;
use yii\web\NotFoundHttpException;

class MonitorsController extends Controller
{
    protected array|bool|int $allowAnonymous = false;

    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        MonitorsAsset::register($this->view);
    }

    public function actionCreate(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $name = $request->getBodyParam('name');
        $url = $request->getBodyParam('url');
        $tags = $request->getBodyParam('tags', ['default']); // optional
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['create'];

        if (!$name || !$url) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor name and URL are required.'),
            ]);
        }

        try {
            // Construct payload for microservice
            $payload = [
                'name' => $name,
                'service_type' => Constants::SERVICE_TYPES['website'],
                'config' => [
                    'meta' => [
                        'url' => $url,
                    ],
                ],
                'is_enabled' => true,
                'tags' => $tags,
            ];

            // Send request to the microservice
            $response = Upsnap::$plugin->apiService->post($endpoint, $payload);

            // Check success or errors
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to create monitor.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor added successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor creation failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function actionSave(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();
        $settingsService = Upsnap::$plugin->settingsService;

        try {
            // Incoming JSON (already a full payload from FE)
            $payload = $request->getRawBody();

            if (!$payload) {
                throw new \Exception('Empty request payload.');
            }

            // Decode for internal processing (optional)
            $payloadArray = json_decode($payload, true);
            if (!$payloadArray) {
                throw new \Exception('Invalid JSON payload.');
            }

            $monitorId = $payloadArray['monitorId'] ?? null;

            $endpoint = $monitorId
                ? Constants::MICROSERVICE_ENDPOINTS['monitors']['update'] . '/' . $monitorId
                : Constants::MICROSERVICE_ENDPOINTS['monitors']['create'];

            $response = $monitorId
                ? Upsnap::$plugin->apiService->put($endpoint, $payloadArray)   // UPDATE
                : Upsnap::$plugin->apiService->post($endpoint, $payloadArray); // CREATE


            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to save monitor.');
            }

            // Sync primary monitor details to local database if this is the configured primary monitor
            $primaryMonitorId = $settingsService->getMonitorId();
            if($primaryMonitorId !== null && $primaryMonitorId === $monitorId) {
                $settingsService->setMonitorId($monitorId);
                $settingsService->setMonitoringUrl($payloadArray['config']['meta']['url']);
            }

            return $this->asJson([
                'success' => true,
                'message' => $monitorId ? 'Monitor updated successfully.' : 'Monitor created successfully.',
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor save failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }


    public function actionList(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['list'];

        try {
            $response = [];
            $response = Upsnap::$plugin->apiService->get($endpoint, ['last_day_uptimes' => true]);

            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(Craft::t('upsnap', 'Something went wrong while fetching monitors. Please try again.'));
            }

            if (!isset($response['status']) || $response['status'] !== 'success') {
                Craft::error("error message" . $response['message'], __METHOD__);
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch monitors.');

                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitors fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitors fetch failed: {$e->getMessage()}", __METHOD__);
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Update a monitor.
     *
     * This action requires a POST request.
     *
     * @throws \Throwable
     */
    public function actionUpdate(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $settingsService->getMonitorId();
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID is required.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['update'];

        try {
            // Prepare the payload using a helper
            $payload = $this->prepareMonitorPayload($request);

            // Send request to microservice
            $response = Upsnap::$plugin->apiService->put("{$endpoint}/{$id}", $payload);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to update monitor.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor updated successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor update failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Delete a monitor.
     *
     * This action requires a POST request.
     *
     * @throws \Throwable
     */
    public function actionDelete(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $request->getBodyParam('monitorId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID is required.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['delete'];

        try {
            $response = Upsnap::$plugin->apiService->delete("{$endpoint}/{$id}");

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to delete monitor.');
                throw new \Exception($errorMsg);
            }

            $primaryMonitor = $settingsService->getMonitorId();

            if($primaryMonitor == $id) {
                $settingsService->setMonitorId(null);
                $settingsService->setMonitoringUrl(null);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor deleted successfully.'),
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor delete failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function actionBulkActions(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $ids = $request->getBodyParam('ids');
        $action = $request->getBodyParam('action');

        if (!$ids || !is_array($ids)) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'IDs are required and must be an array.'),
            ]);
        }

        if (!$action || !in_array($action, ['enable', 'disable', 'delete'])) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Invalid action. Allowed: enable, disable, delete.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['bulk_actions'];

        try {
            // Payload for microservice
            $payload = [
                'ids' => $ids,
                'action' => $action,
            ];

            // Make API call
            $response = Upsnap::$plugin->apiService->patch($endpoint, $payload);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Bulk action failed.');
                throw new \Exception($errorMsg);
            }

            // Handle primary monitor deletion
            if ($action === 'delete') {
                $primaryMonitor = $settingsService->getMonitorId();

                if ($primaryMonitor && in_array($primaryMonitor, $ids, true)) {
                    $settingsService->setMonitorId(null);
                    $settingsService->setMonitoringUrl(null);
                }
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Bulk action completed successfully.'),
            ]);

        } catch (\Throwable $e) {
            Craft::error("Bulk monitor action failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message'=> $e->getMessage()
            ]);
        }
    }


    /**
     * Prepare the payload for creating or updating a monitor.
     */
    private function prepareMonitorPayload($request): array
    {
        $tags = $request->getBodyParam('tags', ['default']);
        $isEnabled = (bool)$request->getBodyParam('enabled', true);

        $services = [
            'broken_links' => [
                'enabled' => (bool)$request->getBodyParam('brokenLinksEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('brokenLinksMonitoringInterval', 3700),
            ],
            'domain' => [
                'enabled' => (bool)$request->getBodyParam('domainEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('domainMonitoringInterval', 86400),
                'notify_days_before_expiry' => (int)$request->getBodyParam('domainDaysBeforeExpiryAlert', 7),
            ],
            'lighthouse' => [
                'enabled' => (bool)$request->getBodyParam('lighthouseEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('lighthouseMonitoringInterval', 86400),
                'strategy' => $request->getBodyParam('lighthouseStrategy', 'desktop'),
            ],
            'mixed_content' => [
                'enabled' => (bool)$request->getBodyParam('mixedContentEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('mixedContentMonitoringInterval', 3600),
            ],
            'ssl' => [
                'enabled' => (bool)$request->getBodyParam('securityCertificatesEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('securityCertificatesMonitoringInterval', 3600),
                'notify_days_before_expiry' => (int)$request->getBodyParam('sslDaysBeforeExpiryAlert', 7),
            ],
            'uptime' => [
                'enabled' => (bool)$request->getBodyParam('reachabilityEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('reachabilityMonitoringInterval', 300),
            ],
        ];

        return [
            'service_type' => Constants::SERVICE_TYPES['website'],
            'config' => [
                'services' => $services,
            ],
            'is_enabled' => $isEnabled,
            'tags' => $tags,
        ];
    }

    /**
     * Render the Add Monitor page
     */
    public function actionNew(?int $monitorId = null): Response
    {
        $this->requireCpRequest();
        $service = Upsnap::getInstance()->settingsService;
        $userDetails = null;
        if($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }
        $userPlanMonitoringInterval = ($userDetails['plan_limits']['min_monitoring_interval'] ?? 5) * 60;
        $variables = [
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS, true, $userPlanMonitoringInterval),
            'strategyOptions' => $service->formatOptions(Constants::LIGHTHOUSE_STRATEGIES),
            'expiryDayOptions' => $service->formatOptions(Constants::EXPIRY_DAYS),
        ];

        if ($monitorId) {
            // EDIT MODE
            $monitor = Upsnap::$plugin->monitors->getMonitorById($monitorId);

            if (!$monitor) {
                throw new NotFoundHttpException("Monitor not found");
            }

            $variables['mode'] = 'edit';
            $variables['monitor'] = $monitor;
            $variables['title'] = "Edit Monitor";
        } else {
            // ADD MODE
            $variables['mode'] = 'add';
            $variables['monitor'] = null;
            $variables['title'] = "Add Monitor";
        }

        return $this->renderTemplate('upsnap/monitors/new/_index', $variables);
    }

    public function actionEdit(string $monitorId): Response
    {
        $this->requireCpRequest();

        $service = Upsnap::getInstance()->settingsService;
        $variables = [
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS, true),
            'strategyOptions' => $service->formatOptions(Constants::LIGHTHOUSE_STRATEGIES),
            'expiryDayOptions' => $service->formatOptions(Constants::EXPIRY_DAYS),
            'mode' => 'edit',
            'title' => 'Edit Monitor',
        ];

        // Fetch details from microservice
        try {
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;

            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception("Unable to fetch monitor details.");
            }

            $monitor = $response['data']['monitor'];

            // Format monitor for FE use (IMPORTANT)
            $variables['monitor'] = $this->formatMonitorForFrontend($monitor);

        } catch (\Throwable $e) {
            Craft::error("Monitor fetch failed: {$e->getMessage()}", __METHOD__);
            throw new NotFoundHttpException("Monitor not found");
        }

        return $this->renderTemplate('upsnap/monitors/new/_index', $variables);
    }

    private function formatMonitorForFrontend(array $m): array
    {
        $config = $m['config'] ?? [];
        $meta = $config['meta'] ?? [];
        $services = $config['services'] ?? [];

        return [
            'id' => $m['id'],
            'name' => $m['name'],
            'url' => $meta['url'] ?? '',
            'enabled' => $m['is_enabled'] ?? true,

            // Health checks
            'brokenLinksEnabled' => $services['broken_links']['enabled'] ?? false,
            'mixedContentEnabled' => $services['mixed_content']['enabled'] ?? false,

            'lighthouseEnabled' => $services['lighthouse']['enabled'] ?? false,
            'lighthouseMonitoringInterval' => $services['lighthouse']['monitor_interval'] ?? "1m",
            'lighthouseStrategy' => $services['lighthouse']['strategy'] ?? 'desktop',

            'reachabilityEnabled' => $services['uptime']['enabled'] ?? false,
            'reachabilityMonitoringInterval' => $services['uptime']['monitor_interval'] ?? "1m",

            // Channels
            'channelIds' => $m['channel_ids'] ?? [],
        ];
    }


    public function actionDetail(string $monitorId): Response
    {
        $this->requireCpRequest();
        $variables = null;

        // Fetch details from microservice
        try {
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;

            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception("Unable to fetch monitor details.");
            }

            $monitor = $response['data']['monitor'];

            $variables['monitor'] = $monitor;

        } catch (\Throwable $e) {
            Craft::error("Monitor fetch failed: {$e->getMessage()}", __METHOD__);
            throw new NotFoundHttpException("Monitor not found");
        }

        return $this->asJson([
            'success' => true,
            'message' => 'Monitor details fetched successfully.',
            'data' => $variables,
        ]);
    }
}
