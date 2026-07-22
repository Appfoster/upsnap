<?php
 
namespace appfoster\upsnap\controllers;
 
use appfoster\upsnap\assetbundles\StatusPageAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;
use appfoster\upsnap\Upsnap;
use GuzzleHttp\Psr7\Utils;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpFoundation\Response;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use Illuminate\Support\Facades\Log;
use function CraftCms\Cms\t;
 
class StatusPageController extends BaseController
{
    public $service;
 
    public function __construct()
    {
        parent::__construct();
        app(InternalAssetRegistry::class)->register(StatusPageAsset::class);
        $this->service = new HealthCheckService($this);
    }
 
    /**
     * Dashboard index
     */
    public function index(): Response
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
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_STATUS_PAGE['key'],
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::getWebAppUrl('webapp'),
            'upsnapStatsPageUrl' => Constants::getWebAppUrl('stats-pages'),
            'userDetails' => $userDetails,
            'defaultCustomization' => Constants::getDefaultCustomization(),
        ];
 
        return $this->renderTemplate('upsnap/status-page/_index', $variables);
    }
 
    public function list(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['list'];
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching status page. Please try again.', [], 'upsnap'));
            }
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch status page.', [], 'upsnap');
 
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Status page fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Status page fetch failed: {$e->getMessage()}");
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function new(?string $statusPageId = null): Response
    {
        $service = Upsnap::getInstance()->settingsService;
        $userDetails = null;
        if ($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }
        $variables = [
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'userDetails' => $userDetails,
            'defaultCustomization' => Constants::getDefaultCustomization(),
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
 
    public function save(): Response
    {
        try {
            $payload = request()->input('payload');
            abort_unless($payload, 400, 'Missing payload');
 
            $payloadArray = json_decode($payload, true);
            if (!is_array($payloadArray)) {
                throw new \Exception('Invalid JSON payload.');
            }
 
            $statusPageId = $payloadArray['statusPageId'] ?? null;
            unset($payloadArray['statusPageId']);
 
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
            Log::error("Status page save failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function upload(): Response
    {
        try {
            $statusPageId = request()->input('statusPageId');
            $type = request()->input('type');
            abort_unless($statusPageId && $type, 400, 'Missing statusPageId or type');
 
            if (!in_array($type, ['logo', 'favicon'], true)) {
                throw new \Exception(t('Invalid upload type.', [], 'upsnap'));
            }
 
            $file = request()->file('file');
            if (!$file) {
                throw new \Exception(t('File is required.', [], 'upsnap'));
            }
 
            $allowedExtensions = $type === 'logo'
                ? ['jpg', 'jpeg', 'png']
                : ['png', 'gif', 'ico'];
 
            $fileExtension = strtolower((string) $file->getClientOriginalExtension());
            if (!in_array($fileExtension, $allowedExtensions, true)) {
                throw new \Exception(t('Invalid file format.', [], 'upsnap'));
            }
 
            if ($file->getSize() > 150 * 1024) {
                throw new \Exception(t('File must be 150 KB or smaller.', [], 'upsnap'));
            }
 
            $endpointTemplate = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['upload'];
            $endpoint = str_replace('{id}', (string) $statusPageId, $endpointTemplate);
 
            $multipart = [
                [
                    'name' => 'type',
                    'contents' => $type,
                ],
                [
                    'name' => 'file',
                    'contents' => Utils::tryFopen($file->getRealPath(), 'r'),
                    'filename' => $file->getClientOriginalName(),
                    'headers' => [
                        'Content-Type' => $file->getClientMimeType() ?: 'application/octet-stream',
                    ],
                ],
            ];
 
            $response = Upsnap::$plugin->apiService->postMultipart($endpoint, $multipart);
 
            if (($response['status'] ?? null) !== 'success') {
                throw new \Exception($response['message'] ?? t('Failed to upload file.', [], 'upsnap'));
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('File uploaded successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Status page upload failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function announcementsList(): Response
    {
        $statusPageId = (string) request()->input('statusPageId', '');
        if ($statusPageId === '') {
            return $this->asJson([
                'success' => false,
                'message' => t('Status Page ID is required.', [], 'upsnap'),
            ]);
        }
 
        try {
            $endpoint = Constants::buildStatusPageAnnouncementEndpoint('list', $statusPageId);
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            if (($response['status'] ?? null) !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to fetch announcements.');
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Announcements fetched successfully.', [], 'upsnap'),
                'data' => [
                    'announcements' => $response['data']['announcements'] ?? [],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("Announcements fetch failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function announcementDetail(): Response
    {
        $statusPageId = (string) request()->input('statusPageId', '');
        $announcementId = (string) request()->input('announcementId', '');
 
        if ($statusPageId === '' || $announcementId === '') {
            return $this->asJson([
                'success' => false,
                'message' => t('Status Page ID and Announcement ID are required.', [], 'upsnap'),
            ]);
        }
 
        try {
            $endpoint = Constants::buildStatusPageAnnouncementEndpoint('detail', $statusPageId, $announcementId);
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            if (($response['status'] ?? null) !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to fetch announcement details.');
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Announcement fetched successfully.', [], 'upsnap'),
                'data' => [
                    'announcement' => $response['data']['announcement'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("Announcement detail fetch failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function announcementSave(): Response
    {
        try {
            $payload = request()->input('payload');
            abort_unless($payload, 400, 'Missing payload');
            $payloadArray = json_decode($payload, true);
 
            if (!is_array($payloadArray)) {
                throw new \Exception('Invalid JSON payload.');
            }
 
            $statusPageId = (string) ($payloadArray['statusPageId'] ?? '');
            $announcementId = isset($payloadArray['announcementId'])
                ? (string) $payloadArray['announcementId']
                : null;
 
            if ($statusPageId === '') {
                throw new \Exception('Status Page ID is required.');
            }
 
            unset($payloadArray['statusPageId'], $payloadArray['announcementId']);
 
            if ($announcementId) {
                $endpoint = Constants::buildStatusPageAnnouncementEndpoint('update', $statusPageId, $announcementId);
                $response = Upsnap::$plugin->apiService->put($endpoint, $payloadArray);
            } else {
                $endpoint = Constants::buildStatusPageAnnouncementEndpoint('create', $statusPageId);
                $response = Upsnap::$plugin->apiService->post($endpoint, $payloadArray);
            }
 
            if (($response['status'] ?? null) !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to save announcement.');
            }
 
            return $this->asJson([
                'success' => true,
                'message' => $announcementId
                    ? t('Announcement updated successfully.', [], 'upsnap')
                    : t('Announcement created successfully.', [], 'upsnap'),
                'data' => [
                    'announcement' => $response['data']['announcement'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("Announcement save failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function announcementDelete(): Response
    {
        $statusPageId = (string) request()->input('statusPageId', '');
        $announcementId = (string) request()->input('announcementId', '');
 
        if ($statusPageId === '' || $announcementId === '') {
            return $this->asJson([
                'success' => false,
                'message' => t('Status Page ID and Announcement ID are required.', [], 'upsnap'),
            ]);
        }
 
        try {
            $endpoint = Constants::buildStatusPageAnnouncementEndpoint('delete', $statusPageId, $announcementId);
            $response = Upsnap::$plugin->apiService->delete($endpoint);
 
            if (($response['status'] ?? null) !== 'success') {
                throw new \Exception($response['message'] ?? 'Failed to delete announcement.');
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Announcement deleted successfully.', [], 'upsnap'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Announcement delete failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function delete(): Response
    {
        $id = request()->input('statusPageId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => t('Status Page ID is required.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['delete'];
 
        try {
            $response = Upsnap::$plugin->apiService->delete("{$endpoint}/{$id}");
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to delete status page.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Status page deleted successfully.', [], 'upsnap'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Status page delete failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function resetShareableId(): Response
    {
        $id = request()->input('statusPageId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => t('Status Page ID is required.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['status-page']['list'];
 
        try {
            $response = Upsnap::$plugin->apiService->post("{$endpoint}/{$id}/reset");
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to reset status page shareable id.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Status page shareable id reset successfully.', [], 'upsnap'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Status page shareable id reset failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
