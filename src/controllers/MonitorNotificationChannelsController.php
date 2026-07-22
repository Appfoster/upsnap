<?php
 
namespace appfoster\upsnap\controllers;
 
use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use function CraftCms\Cms\t;
 
class MonitorNotificationChannelsController extends BaseController
{
    private $apiService;
    private $settingsService;
 
    public function __construct()
    {
        parent::__construct();
        $this->apiService = Upsnap::$plugin->apiService;
        $this->settingsService =  Upsnap::$plugin->settingsService;
    }
 
    public function listSupportedTypes(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['integrations']['supported'];
 
        try {
            $response = $this->apiService->get($endpoint);
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                Log::error("Supported channels fetch failed: " . json_encode($response));
                $errorMsg = $response['message'] ?? t('Failed to fetch notification channels.', [], 'upsnap');
 
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Supported notification channels fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Supported channels fetch failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => []
            ]);
        }
    }
 
    public function create(): Response
    {
        $monitorId = $this->settingsService->getMonitorId();
        $type = request()->input('type');
        $label = request()->input('label');
        $config = request()->input('config', []);
 
        if (!$type || !$label || empty($config)) {
            return $this->asJson([
                'success' => false,
                'message' => t('Type, label, and config are required.', [], 'upsnap'),
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
                $errorMsg = $response['message'] ?? t('Failed to create notification channel.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Notification channel added successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Notification channel creation failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function update(): Response
    {
        $channelId = request()->input('channelId');
        $label = request()->input('label');
        $config = request()->input('config', []);
        $isEnabled = request()->input('is_enabled', true);
 
        if (!$channelId || !$label || empty($config)) {
            return $this->asJson([
                'success' => false,
                'message' => t('Channel ID, label, and config are required.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['integrations']['create'] . '/' . $channelId;
 
        try {
            $payload = [
                'name' => $label,
                'config' => $config,
                'is_enabled' => $isEnabled
            ];
 
            $response = $this->apiService->put($endpoint, $payload);
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to update notification channel.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Notification channel updated successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Notification channel update failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    public function list(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['integrations']['list'];
 
        try {
            $response = $this->apiService->get($endpoint);
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                Log::error("Notification channels fetch failed: " . json_encode($response));
                $errorMsg = $response['message'] ?? t('Failed to fetch notification channels.', [], 'upsnap');
 
                if (stripos($errorMsg, 'invalid authentication token') !== false) {
                    $errorMsg = t(
                        'The API token seems to be invalid (it might have expired, been suspended, or deleted). Please add a new API token to be able to list, add, or update notification channels.',
                        [],
                        'upsnap'
                    );
                }
 
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('User notification channels fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Notification channels fetch failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => []
            ]);
        }
    }
 
    public function delete(): Response
    {
        $channelId = request()->input('channelId');
 
        if (!$channelId) {
            return $this->asJson([
                'success' => false,
                'message' => t('Channel ID is required.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['notification_channels']['list'] . '/' . $channelId;
 
        try {
            $response = $this->apiService->delete($endpoint);
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to delete notification channel.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Notification channel deleted successfully.', [], 'upsnap'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Notification channel delete failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
 
    // ✅ Test Notification Channel
    public function test(): Response
    {
        $channelId = request()->input('channelId');
 
        if (!$channelId) {
            return $this->asJson([
                'success' => false,
                'message' => t('Channel ID is required.', [], 'upsnap'),
            ]);
        }
 
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['notification_channels']['list'] . '/' . $channelId . '/test';
 
        try {
            $response = $this->apiService->post($endpoint, []);  // test requires POST
 
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to test notification channel.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Test notification sent successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Notification channel test failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
