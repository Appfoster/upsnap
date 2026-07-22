<?php
 
namespace appfoster\upsnap\controllers;
 
use appfoster\upsnap\assetbundles\IncidentDetailAsset;
use appfoster\upsnap\assetbundles\IncidentsAsset;
use appfoster\upsnap\Constants;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use Symfony\Component\HttpFoundation\Response;
use appfoster\upsnap\Upsnap;
use CraftCms\Cms\Support\Url;
use Illuminate\Support\Facades\Log;
use function CraftCms\Cms\t;
 
class IncidentsController extends BaseController
{
    public function __construct()
    {
        parent::__construct();
    }
 
    /**
     * Render the incidents listing page.
     * Passes the monitors list server-side so the page can pre-populate
     * the monitor <select> without a loading flash.
     *
     * GET upsnap/incidents
     */
    public function index(): Response
    {
        app(InternalAssetRegistry::class)->register(IncidentsAsset::class);
 
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
            Log::error('Failed to pre-fetch monitors for incidents page: ' . $e->getMessage());
        }
 
        $variables = [
            'title' => Constants::SUBNAV_ITEM_INCIDENTS['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_INCIDENTS['key'],
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::getWebAppUrl('webapp'),
            'monitors' => $monitors,
            'userDetails' => $userDetails,
        ];
 
        return $this->renderTemplate('upsnap/incidents/_index', $variables);
    }
 
    /**
     * Renders the incident detail page.
     *
     * GET upsnap/incidents/{incidentId}
     */
    public function view(int $incidentId): Response
    {
        app(InternalAssetRegistry::class)->register(IncidentDetailAsset::class);
 
        $monitorId = request()->query('monitorId', '');
 
        // Build back-link to incidents list, preserving monitor filter if present
        $backParams = $monitorId ? ['monitor_id' => $monitorId] : [];
        $cpIncidentsUrl = Url::cpUrl('upsnap/incidents', $backParams);
 
        $variables = [
            'title'                => t('Incident Details', [], 'upsnap'),
            'selectedSubnavItem'   => 'incidents',
            'incidentId'           => $incidentId,
            'monitorId'            => $monitorId,
            'detailEndpoint'       => Url::actionUrl('upsnap/incidents/detail'),
            'regionsEndpoint'      => Url::actionUrl('upsnap/regions/list'),
            'cpIncidentsUrl'       => $cpIncidentsUrl,
            'monitorDetailBaseUrl' => Url::cpUrl('upsnap/monitors/detail/'),
        ];
 
        return $this->renderTemplate('upsnap/incidents/detail', $variables);
    }
 
    /**
     * JSON proxy: fetches a single incident + its activity log from the microservice.
     *
     * GET upsnap/incidents/detail?incidentId=<id>
     */
    public function detail(): Response
    {
        $incidentId = request()->query('incidentId');
        abort_unless($incidentId, 400, 'Missing incidentId');
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['incident_detail'] . '/' . $incidentId;
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching the incident.', [], 'upsnap'));
            }
 
            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch incident.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'data'    => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error('Incident detail fetch failed: ' . $e->getMessage());
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    /**
     * Stream a CSV or PDF export.
     */
    public function export(): Response
    {
        $monitorId = request()->query('monitorId');
        $fileType  = request()->query('file_type', 'csv');
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['export'];
 
        $params = array_filter([
            'monitor_id'  => $monitorId ?: null,
            'start_time' => request()->query('start_time'),
            'end_time'   => request()->query('end_time'),
            'type'       => request()->query('type'),
            'search'     => request()->query('search'),
            'region'     => request()->query('region'),
            'file_type'  => $fileType,
        ], fn($v) => $v !== null && $v !== '');
 
        $accept = $fileType === 'pdf' ? 'application/pdf' : 'text/csv';
 
        try {
            $raw = Upsnap::$plugin->apiService->getRaw($endpoint, $params, $accept);
 
            return response($raw['body'], 200, [
                'Content-Type' => $raw['contentType'],
                'Content-Disposition' => $raw['contentDisposition']
            ]);
        } catch (\Throwable $e) {
            Log::error('Incidents export failed: ' . $e->getMessage());
            return $this->asJson(['success' => false, 'message' => $e->getMessage()]);
        }
    }
 
    /**
     * Lists the incidents for a given monitor, with pagination and filtering.
     */
    public function list(): Response
    {
        // Normalise time_range: the external API requires uppercase (e.g. '7D', '30D').
        // The Twig select emits '7D' and '1M'; map '1M' → '30D' for API compatibility.
        $rawTimeRange = request()->query('time_range', '24h');
        $timeRange = match(strtolower($rawTimeRange)) {
            '7d'  => '7D',
            '1m'  => '1M',
            '3m' => '3M',
            default => $rawTimeRange,
        };
 
        $params = array_filter([
            'monitorId'      => request()->query('monitorId'),
            'time_range'     => $timeRange,
            'page'           => request()->query('page', 1),
            'page_size'      => request()->query('page_size', 20),
            'check_type'     => request()->query('check_type'),
            'search'         => request()->query('search'),
            'sort_by'        => request()->query('sort_by', 'timestamp'),
            'sort_order'     => request()->query('sort_order', 'desc'),
            'region'         => request()->query('region'),
            'include_paused' => request()->query('include_paused'),
        ], fn($v) => $v !== null && $v !== '');
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['incidents'];
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);
 
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching incidents. Please try again.', [], 'upsnap'));
            }
 
            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch incidents.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success'    => true,
                'message'    => t('Incidents fetched successfully.', [], 'upsnap'),
                'data'       => $response['data'] ?? [],
                'pagination' => $response['pagination'] ?? $response['meta'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error('Incidents fetch failed: ' . $e->getMessage());
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    /**
     * Fetches incident stats for monitors (all or single via ?monitor_id=<id>).
     * Returns region-wise incident counts for the last 24 hours.
     *
     * @return Response
     */
    public function incidentStats(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['incident_stats'];
 
        try {
            $params = [];
            $monitorId = request()->query('monitor_id');
            if ($monitorId) {
                $params['monitor_id'] = $monitorId;
            }
 
            $response = Upsnap::$plugin->apiService->get($endpoint, $params);
 
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching incident stats.', [], 'upsnap'));
            }
 
            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch incident stats.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Incident stats fetched successfully.', [], 'upsnap'),
                'data' => [
                    'stats' => $response['data'] ?? [],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("Incident stats fetch failed: {$e->getMessage()}");
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
