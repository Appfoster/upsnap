<?php
 
namespace appfoster\upsnap\controllers;
 
use appfoster\upsnap\assetbundles\MonitorsAsset;
use appfoster\upsnap\Constants;
use Symfony\Component\HttpFoundation\Response;
use appfoster\upsnap\Upsnap;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use Illuminate\Support\Facades\Log;
use function CraftCms\Cms\t;
 
class MonitorsController extends BaseController
{
    public function __construct()
    {
        parent::__construct();
        app(InternalAssetRegistry::class)->register(MonitorsAsset::class);
    }
 
    /**
     * Render the monitors listing page.
     * GET upsnap/monitors
     */
    public function index(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $settingsService->validateApiKey();
 
        $userDetails = null;
        if ($settingsService->getApiKey()) {
            $userDetails = $settingsService->getUserDetails();
        }
 
        $variables = [
            'title' => Constants::SUBNAV_ITEM_MONITORS['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_MONITORS['key'],
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::getWebAppUrl('webapp'),
            'userDetails' => $userDetails,
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'settings' => [
                'monitoringUrl' => $settingsService->getMonitoringUrl(),
                'monitorId' => $settingsService->getMonitorId()
            ],
        ];
 
        return $this->renderTemplate('upsnap/monitors/_index', $variables);
    }
 
    public function create(): Response
    {
        $name = request()->input('name');
        $url = request()->input('url');
        $tags = request()->input('tags', ['default']); // optional
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['create'];
 
        if (!$name || !$url) {
            return $this->asJson([
                'success' => false,
                'message' => t('Monitor name and URL are required.', [], 'upsnap'),
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
                $errorMsg = $response['message'] ?? t('Failed to create monitor.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Monitor added successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Monitor creation failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function save(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
 
        try {
            // Incoming JSON (already a full payload from FE)
            $payload = request()->getContent();
 
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
                
                // Only update monitoring URL for monitors that have a URL (not port monitors)
                $monitorData = $response['data']['monitor'] ?? [];
                $serviceType = $monitorData['service_type'] ?? null;
                
                if ($serviceType !== 'port') {
                    $settingsService->setMonitoringUrl($payloadArray['config']['meta']['url']);
                }
            }
 
            return $this->asJson([
                'success' => true,
                'message' => $monitorId ? 'Monitor updated successfully.' : 'Monitor created successfully.',
                'data' => $response['data']['monitor'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Monitor save failed: {$e->getMessage()}");
 
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
    public function getSettings(): Response
    {
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
            Log::error("Monitors settings fetch failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function list(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['list'];
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint, ['last_day_uptimes' => true]);
 
            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching monitors. Please try again.', [], 'upsnap'));
            }
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch monitors.', [], 'upsnap');
 
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Monitors fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Monitors fetch failed: {$e->getMessage()}");
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function widgetStatus(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
 
        if (!$settingsService->getApiKey()) {
            return $this->asJson([
                'success' => false,
                'message' => t('Connect UpSnap to view monitor statuses.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['list'];
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            if (!is_array($response) || ($response['status'] ?? null) !== 'success') {
                $errorMsg = is_array($response)
                    ? ($response['message'] ?? t('Failed to fetch monitors.', [], 'upsnap'))
                    : t('Failed to fetch monitors.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            $data = $response['data'] ?? [];
            $monitors = $data['monitors'] ?? [];
            if (!is_array($monitors)) {
                $monitors = [];
            }
            $visibleMonitors = $monitors;
 
            $billingResponse = Upsnap::$plugin->apiService->get(Constants::MICROSERVICE_ENDPOINTS['billing']['status']);
            $planName = (is_array($billingResponse) && ($billingResponse['status'] ?? null) === 'success')
                ? strtolower((string)($billingResponse['data']['plan_name'] ?? 'free'))
                : 'free';
            $isFreePlan = in_array($planName, ['free', 'trial'], true);
 
            if ($isFreePlan) {
                return $this->asJson([
                    'success' => true,
                    'data' => ['isFreePlan' => true],
                ]);
            }
 
            $uptimeMap = [];
            try {
                $statsRes = Upsnap::$plugin->apiService->get(
                    Constants::MICROSERVICE_ENDPOINTS['monitors']['monitors_stats'],
                    ['uptime_stats_time_frames' => 'day,week,month']
                );
                if (is_array($statsRes) && ($statsRes['status'] ?? null) === 'success') {
                    foreach ($statsRes['data']['uptime_stats'] ?? [] as $entry) {
                        $id = (string)($entry['monitor_id'] ?? '');
                        if ($id === '') continue;
                        $periods = [];
                        foreach (['day', 'week', 'month'] as $period) {
                            $stats = $entry['stats'][$period] ?? null;
                            if (!is_array($stats)) continue;
                            $periods[$period] = [
                                'uptime'    => isset($stats['uptime_percentage']) ? round((float)$stats['uptime_percentage'], 1) : null,
                                'incidents' => isset($stats['incident_count']) ? (int)$stats['incident_count'] : null,
                            ];
                        }
                        if (!empty($periods)) {
                            $uptimeMap[$id] = $periods;
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("Widget uptime stats fetch failed: {$e->getMessage()}");
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Monitor statuses fetched successfully.', [], 'upsnap'),
                'data' => [
                    'monitors' => array_map(
                        fn($m) => $this->formatMonitorForWidget($m, $uptimeMap),
                        $visibleMonitors
                    ),
                    'total' => count($monitors),
                    'isFreePlan' => $isFreePlan,
                    'subscriptionType' => $planName,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("Widget monitor status fetch failed: {$e->getMessage()}");
 
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
    public function delete(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $id = request()->input('monitorId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => t('Monitor ID is required.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['delete'];
 
        try {
            $response = Upsnap::$plugin->apiService->delete("{$endpoint}/{$id}");
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to delete monitor.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            $primaryMonitor = $settingsService->getMonitorId();
 
            if ($primaryMonitor == $id) {
                $settingsService->setMonitorId(null);
                $settingsService->setMonitoringUrl(null);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Monitor deleted successfully.', [], 'upsnap'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Monitor delete failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function bulkActions(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $ids = request()->input('ids');
        $action = request()->input('action');
 
        if (!$ids || !is_array($ids)) {
            return $this->asJson([
                'success' => false,
                'message' => t('IDs are required and must be an array.', [], 'upsnap'),
            ]);
        }
 
        if (!$action || !in_array($action, ['enable', 'disable', 'delete'])) {
            return $this->asJson([
                'success' => false,
                'message' => t('Invalid action. Allowed: enable, disable, delete.', [], 'upsnap'),
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
                $errorMsg = $response['message'] ?? t('Bulk action failed.', [], 'upsnap');
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
                'message' => t('Bulk action completed successfully.', [], 'upsnap'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Bulk monitor action failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
 
    /**
     * Render the Add Monitor page
     */
    public function new(): Response
    {
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
            'mode' => 'add',
            'monitor' => null,
            'title' => "Add Monitor",
        ];
 
        return $this->renderTemplate('upsnap/monitors/new/_index', $variables);
    }
 
    public function edit(string $monitorId): Response
    {
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
            Log::error("Monitor fetch failed: {$e->getMessage()}");
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
            'tag_ids' => $m['tag_ids'] ?? [],
        ];
 
        // Format based on monitor type
        switch ($serviceType) {
            case 'port':
                $formatted['portHost'] = $meta['host'] ?? '';
                $formatted['portNumber'] = $meta['port'] ?? '';
                $formatted['portTimeout'] = $meta['timeout'] ?? 30;
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
                $formatted['websiteTimeout'] = $meta['timeout'] ?? 30;
 
                // Health checks
                $formatted['brokenLinksEnabled'] = $services['broken_links']['enabled'] ?? false;
                $formatted['brokenLinksMonitoringInterval'] = $services['broken_links']['monitor_interval'] ?? "86400";
 
                $formatted['mixedContentEnabled'] = $services['mixed_content']['enabled'] ?? false;
                $formatted['mixedContentMonitoringInterval'] = $services['mixed_content']['monitor_interval'] ?? "86400";
 
                $formatted['lighthouseEnabled'] = $services['lighthouse']['enabled'] ?? false;
                $formatted['lighthouseMonitoringInterval'] = $services['lighthouse']['monitor_interval'] ?? "86400";
                $formatted['lighthouseStrategy'] = $services['lighthouse']['strategy'] ?? 'desktop';
 
                $formatted['reachabilityEnabled'] = $services['uptime']['enabled'] ?? false;
                $formatted['reachabilityMonitoringInterval'] = $services['uptime']['monitor_interval'] ?? "300";
 
                $formatted['domainEnabled'] = $services['domain']['enabled'] ?? false;
                $formatted['domainMonitoringInterval'] = $services['domain']['monitor_interval'] ?? "86400";
                $formatted['domainDaysBeforeExpiryAlert'] = $services['domain']['notify_days_before_expiry'] ?? 7;
 
                $formatted['securityCertificatesEnabled'] = $services['ssl']['enabled'] ?? false;
                $formatted['securityCertificatesMonitoringInterval'] = $services['ssl']['monitor_interval'] ?? "86400";
                $formatted['sslDaysBeforeExpiryAlert'] = $services['ssl']['notify_days_before_expiry'] ?? 7;
                break;
        }
 
        return $formatted;
    }
 
    private function formatMonitorForWidget(array $monitor, array $uptimeMap = []): array
    {
        $statusData = $this->resolveWidgetStatusData($monitor);
        $name = trim((string)($monitor['name'] ?? ''));
        $url = trim((string)($monitor['url'] ?? $monitor['config']['meta']['url'] ?? ''));
        $isEnabled = (bool)($monitor['is_enabled'] ?? true);
 
        if (!$isEnabled) {
            $status = 'paused';
        } elseif ($monitor['is_under_maintenance'] ?? false) {
            $status = 'maintenance';
        } else {
            $status = $statusData['status'];
        }
 
        $regionName = null;
        foreach (($monitor['regions'] ?? []) as $region) {
            if (is_array($region) && ($region['is_primary'] ?? false)) {
                $regionName = (string)($region['name'] ?? '');
                break;
            }
        }
 
        $monitorId = (string)($monitor['id'] ?? '');
        $statsByPeriod = $uptimeMap[$monitorId] ?? [];
 
        return [
            'id' => $monitorId,
            'name' => $name !== '' ? $name : ($url !== '' ? $url : t('Unnamed monitor', [], 'upsnap')),
            'url' => $url,
            'serviceType' => (string)($monitor['service_type'] ?? 'website'),
            'status' => $status,
            'lastCheckedAt' => $statusData['lastCheckedAt'],
            'regionName' => $regionName,
            'statsByPeriod' => $statsByPeriod,
        ];
    }
 
    private function resolveWidgetStatusData(array $monitor): array
    {
        $status = $monitor['last_status'] ?? $monitor['status'] ?? null;
        $lastCheckedAt = $monitor['last_checked_at'] ?? $monitor['last_check_at'] ?? $monitor['lastCheckedAt'] ?? null;
 
        if (!$status && isset($monitor['service_last_checks']) && is_array($monitor['service_last_checks'])) {
            $primaryRegionId = null;
            foreach (($monitor['regions'] ?? []) as $region) {
                if (is_array($region) && ($region['is_primary'] ?? false)) {
                    $primaryRegionId = (string)($region['id'] ?? '');
                    break;
                }
            }
 
            $regionChecks = $primaryRegionId && isset($monitor['service_last_checks'][$primaryRegionId])
                ? $monitor['service_last_checks'][$primaryRegionId]
                : reset($monitor['service_last_checks']);
 
            if (is_array($regionChecks)) {
                $serviceType = $monitor['service_type'] ?? 'website';
                $serviceKey = $serviceType === 'port' ? 'port_check' : ($serviceType === 'keyword' ? 'keyword' : 'uptime');
                $serviceCheck = $regionChecks[$serviceKey] ?? reset($regionChecks);
 
                if (is_array($serviceCheck)) {
                    $status = $serviceCheck['last_status'] ?? $status;
                    $lastCheckedAt = $serviceCheck['last_checked_at'] ?? $serviceCheck['last_check_at'] ?? $lastCheckedAt;
                }
            }
        }
 
        $status = strtolower((string)$status);
        if (!in_array($status, ['up', 'down', 'degraded'], true)) {
            $status = 'unknown';
        }
 
        return [
            'status' => $status,
            'lastCheckedAt' => $lastCheckedAt,
        ];
    }
 
    public function detail(string $monitorId): Response
    {
        try {
            $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;
 
            $params = array_merge(
                request()->query(),
                request()->post()
            );
 
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
            Log::error("Monitor fetch failed: {$e->getMessage()}");
            throw new NotFoundHttpException('Monitor not found');
        }
    }
 
    public function histogramData(string $monitorId): Response
    {
        session()->save();
 
        try {
            $endpoint = $this->buildMicroserviceEndpoint(Constants::MICROSERVICE_ENDPOINTS['monitors']['histogram'], $monitorId);
 
            $params = array_merge(
                request()->query(),
                request()->post()
            );
 
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
            Log::error("Histogram data fetch failed: {$e->getMessage()}");
            throw new NotFoundHttpException('Histogram data not found');
        }
    }
 
    public function responseTimeData(string $monitorId): Response
    {
        session()->save();
 
        try {
            $endpoint = $this->buildMicroserviceEndpoint(Constants::MICROSERVICE_ENDPOINTS['monitors']['response_time'], $monitorId);
 
            $params = array_merge(
                request()->query(),
                request()->post()
            );
 
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
            Log::error("Response time data fetch failed: {$e->getMessage()}");
            throw new NotFoundHttpException('Response time data not found');
        }
    }
 
    public function uptimeStatsData(string $monitorId): Response
    {
        session()->save();
 
        try {
            $endpoint = $this->buildMicroserviceEndpoint(Constants::MICROSERVICE_ENDPOINTS['monitors']['uptime_stats'], $monitorId);
 
            $params = array_merge(
                request()->query(),
                request()->post(),
                ["uptime_stats_time_frames" => "day,week,month,year"]
            );
 
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
            Log::error("Uptime stats data fetch failed: {$e->getMessage()}");
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
 
    /**
     * Fetches uptime stats data for all monitors.
     *
     * @return Response
     * @throws \Throwable
     */
    public function uptimeStats(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['monitors_stats'];
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching monitors uptime stats.. Please try again.', [], 'upsnap'));
            }
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch monitors uptime stats.', [], 'upsnap');
 
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Monitors uptime stats fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Monitors uptime stats fetch failed: {$e->getMessage()}");
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
