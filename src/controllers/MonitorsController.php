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

            // Validate regions
            $regions = $payloadArray['regions'] ?? [];
            if (empty($regions)) {
                throw new \Exception('Please select at least one region.');
            }

            // Validate that a primary region is set
            $hasPrimaryRegion = false;
            foreach ($regions as $region) {
                if (isset($region['is_primary']) && $region['is_primary'] === true) {
                    $hasPrimaryRegion = true;
                    break;
                }
            }

            if (!$hasPrimaryRegion) {
                throw new \Exception('Please set a primary region.');
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
            if ($primaryMonitorId !== null && $primaryMonitorId === $monitorId) {
                $settingsService->setMonitorId($monitorId);
                $settingsService->setMonitoringUrl($payloadArray['config']['meta']['url']);
            }

            return $this->asJson([
                'success' => true,
                'message' => $monitorId ? 'Monitor updated successfully.' : 'Monitor created successfully.',
                'data' => $response['data']['monitor'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor save failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }


    /**
     * Get monitor settings/config from the microservice.
     * 
     * GET /actions/upsnap/monitors/get-settings
     */
    public function actionGetSettings(): Response
    {
        $this->requireCpRequest();

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['settings'];

        try {

            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to fetch monitor settings.');
            }

            // Return all settings
            return $this->asJson([
                'success' => true,
                'message' => 'Monitors settings fetched successfully.',
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitors settings fetch failed: {$e->getMessage()}", __METHOD__);

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

            if ($primaryMonitor == $id) {
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
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * Render the Add Monitor page
     */
    public function actionNew(?int $monitorId = null): Response
    {
        $this->requireCpRequest();
        $service = Upsnap::getInstance()->settingsService;
        $userDetails = null;
        if ($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }
        $userPlanMonitoringInterval = ($userDetails['plan_limits']['min_monitoring_interval'] ?? 5) * 60;
        $variables = [
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS, true, $userPlanMonitoringInterval),
            'strategyOptions' => $service->formatOptions(Constants::LIGHTHOUSE_STRATEGIES),
            'expiryDayOptions' => $service->formatOptions(Constants::EXPIRY_DAYS),
            'userDetails' => $userDetails,
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

        $userDetails = null;
        if ($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }

        $variables = [
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS, true),
            'strategyOptions' => $service->formatOptions(Constants::LIGHTHOUSE_STRATEGIES),
            'expiryDayOptions' => $service->formatOptions(Constants::EXPIRY_DAYS),
            'mode' => 'edit',
            'title' => 'Edit Monitor',
            'userDetails' => $userDetails,
        ];

        // Fetch monitor details from microservice
        try {
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;

            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception("Unable to fetch monitor details.");
            }

            $monitor = $response['data']['monitor'];

            // Fetch config/settings from the separate settings API
            $settingsEndpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['settings'];
            $settingsResponse = Upsnap::$plugin->apiService->get($settingsEndpoint, ['id' => $monitorId]);

            $config = [];
            if (isset($settingsResponse['status']) && $settingsResponse['status'] === 'success') {
                $config = $settingsResponse['data']['settings'] ?? [];
            }

            // Merge config into monitor data
            $monitor['config'] = $config;

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
        $serviceType = $m['service_type'] ?? 'website';

        $formatted = [
            'id' => $m['id'],
            'name' => $m['name'],
            'enabled' => $m['is_enabled'] ?? true,
            'regions' => $m['regions'] ?? [],
            'monitorType' => $serviceType,
            'channelIds' => $m['channel_ids'] ?? [],
        ];

        // Format based on monitor type
        switch ($serviceType) {
            case 'port':
                $formatted['portHost'] = $meta['host'] ?? '';
                $formatted['portNumber'] = $meta['port'] ?? '';
                $formatted['portTimeout'] = $meta['timeout'] ?? 5;
                $formatted['portEnabled'] = $services['port_check']['enabled'] ?? false;
                $formatted['portMonitorInterval'] = $services['port_check']['monitor_interval'] ?? 300;
                break;

            case 'keyword':
                $formatted['keywordUrl'] = $meta['url'] ?? '';
                $formatted['keywordTimeout'] = $meta['timeout'] ?? 30;
                $formatted['keywordFollowRedirects'] = $meta['follow_redirects'] ?? false;

                $keywordService = $services['keyword'] ?? [];
                $formatted['keywordEnabled'] = $keywordService['enabled'] ?? false;
                $formatted['keywordMonitorInterval'] = $keywordService['monitor_interval'] ?? 300;
                $formatted['keywordMatchAll'] = $keywordService['match_all'] ?? false;

                // Extract keywords with their individual settings
                $keywords = [];
                if (!empty($keywordService['keywords'])) {
                    foreach ($keywordService['keywords'] as $kw) {
                        $keywords[] = [
                            'text' => $kw['text'] ?? '',
                            'matchCondition' => $kw['type'] ?? 'must_contain',
                            'isRegex' => $kw['is_regex'] ?? false,
                            'caseSensitive' => $kw['case_sensitive'] ?? false,
                        ];
                    }
                }

                $formatted['keywords'] = $keywords;
                break;

            case 'website':
            default:
                $formatted['url'] = $meta['url'] ?? '';

                // Health checks
                $formatted['brokenLinksEnabled'] = $services['broken_links']['enabled'] ?? false;
                $formatted['brokenLinksMonitoringInterval'] = $services['broken_links']['monitor_interval'] ?? "300";

                $formatted['mixedContentEnabled'] = $services['mixed_content']['enabled'] ?? false;
                $formatted['mixedContentMonitoringInterval'] = $services['mixed_content']['monitor_interval'] ?? "300";

                $formatted['lighthouseEnabled'] = $services['lighthouse']['enabled'] ?? false;
                $formatted['lighthouseMonitoringInterval'] = $services['lighthouse']['monitor_interval'] ?? "86400";
                $formatted['lighthouseStrategy'] = $services['lighthouse']['strategy'] ?? 'desktop';

                $formatted['reachabilityEnabled'] = $services['uptime']['enabled'] ?? false;
                $formatted['reachabilityMonitoringInterval'] = $services['uptime']['monitor_interval'] ?? "300";

                $formatted['domainEnabled'] = $services['domain']['enabled'] ?? false;
                $formatted['domainMonitoringInterval'] = $services['domain']['monitor_interval'] ?? "300";
                $formatted['domainDaysBeforeExpiryAlert'] = $services['domain']['notify_days_before_expiry'] ?? 7;

                $formatted['securityCertificatesEnabled'] = $services['ssl']['enabled'] ?? false;
                $formatted['securityCertificatesMonitoringInterval'] = $services['ssl']['monitor_interval'] ?? "300";
                $formatted['sslDaysBeforeExpiryAlert'] = $services['ssl']['notify_days_before_expiry'] ?? 7;
                break;
        }

        return $formatted;
    }


    public function actionDetail(string $monitorId): Response
    {
        $request = Craft::$app->getRequest();

        $params = array_merge(
            $request->getQueryParams(),
            $request->getBodyParams()
        );

        try {
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;

            // Pass all params to the service
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception('Unable to fetch monitor details.');
            }

            return $this->asJson([
                'success' => true,
                'message' => 'Monitor details fetched successfully.',
                'data' => [
                    'monitor' => $response['data']['monitor'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor fetch failed: {$e->getMessage()}", __METHOD__);
            throw new NotFoundHttpException('Monitor not found');
        }
    }

    public function actionHistogramData(string $monitorId): Response
    {
        $request = Craft::$app->getRequest();

        $params = array_merge(
            $request->getQueryParams(),
            $request->getBodyParams()
        );

        try {
            $endpoint = $this->buildMicroserviceEndpoint(Constants::MICROSERVICE_ENDPOINTS['monitors']['histogram'], $monitorId);

            // Pass all params including region to the service
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception('Unable to fetch histogram data.');
            }

            return $this->asJson([
                'success' => true,
                'message' => 'Histogram data fetched successfully.',
                'data' => [
                    'histogram' => $response['data']['histogram'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Histogram data fetch failed: {$e->getMessage()}", __METHOD__);
            throw new NotFoundHttpException('Histogram data not found');
        }
    }

    public function actionResponseTimeData(string $monitorId): Response
    {
        $request = Craft::$app->getRequest();

        $params = array_merge(
            $request->getQueryParams(),
            $request->getBodyParams()
        );

        try {
            $endpoint = $this->buildMicroserviceEndpoint(Constants::MICROSERVICE_ENDPOINTS['monitors']['response_time'], $monitorId);

            // Pass all params to the service
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception('Unable to fetch response time data.');
            }

            return $this->asJson([
                'success' => true,
                'message' => 'Response time data fetched successfully.',
                'data' => [
                    'response_time_data' => $response['data']['response_time'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Response time data fetch failed: {$e->getMessage()}", __METHOD__);
            throw new NotFoundHttpException('Response time data not found');
        }
    }

    public function actionUptimeStatsData(string $monitorId): Response
    {
        $request = Craft::$app->getRequest();

        $params = array_merge(
            $request->getQueryParams(),
            $request->getBodyParams(),
            ["uptime_stats_time_frames" => "day,week,month,year"]
        );

        try {
            $endpoint = $this->buildMicroserviceEndpoint(Constants::MICROSERVICE_ENDPOINTS['monitors']['uptime_stats'], $monitorId);

            // Pass all params including region to the service
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                throw new \Exception('Unable to fetch uptime stats data.');
            }

            return $this->asJson([
                'success' => true,
                'message' => 'Uptime stats data fetched successfully.',
                'data' => [
                    'uptime_stats' => $response['data']['uptime_stats'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Uptime stats data fetch failed: {$e->getMessage()}", __METHOD__);
            throw new NotFoundHttpException('Uptime stats data not found');
        }
    }

    /**
     * Build a monitor endpoint by replacing the `{monitorId}` placeholder in the route template.
     */
    private function buildMicroserviceEndpoint(string $microserviceUrl, string $monitorId): string
    {
        return str_replace('{monitorId}', $monitorId, $microserviceUrl);
    }
}
