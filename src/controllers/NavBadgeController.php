<?php
 
namespace appfoster\upsnap\controllers;
 
use Illuminate\Support\Facades\Log;
use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;
use Symfony\Component\HttpFoundation\Response;
 
class NavBadgeController extends BaseController
{
    public function status(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
 
        if (!$settingsService->getApiKey()) {
            return $this->asJson(['down' => 0]);
        }
 
        try {
            $billingResponse = Upsnap::$plugin->apiService->get(Constants::MICROSERVICE_ENDPOINTS['billing']['status']);
            if (!is_array($billingResponse) || ($billingResponse['status'] ?? null) !== 'success') {
                return $this->asJson(['down' => 0]);
            }
 
            $planName = strtolower((string)($billingResponse['data']['plan_name'] ?? ''));
            if (in_array($planName, ['free', 'trial'], true)) {
                return $this->asJson(['down' => 0, 'free' => true]);
            }
 
            $response = Upsnap::$plugin->apiService->get(Constants::MICROSERVICE_ENDPOINTS['monitors']['list']);
 
            if (!is_array($response) || ($response['status'] ?? null) !== 'success') {
                return $this->asJson(['down' => 0]);
            }
 
            $data = $response['data'] ?? [];
            $monitors = $data['monitors'] ?? $data;
 
            if (!is_array($monitors)) {
                return $this->asJson(['down' => 0]);
            }
 
            $downCount = 0;
            foreach ($monitors as $monitor) {
                if (!($monitor['is_enabled'] ?? false) || ($monitor['is_under_maintenance'] ?? false)) {
                    continue;
                }
 
                $serviceLastChecks = $monitor['service_last_checks'] ?? [];
                foreach ($serviceLastChecks as $regionChecks) {
                    $uptimeStatus = $regionChecks['uptime']['last_status'] ?? null;
                    if ($uptimeStatus === 'down' || $uptimeStatus === 'degraded') {
                        $downCount++;
                        break;
                    }
                }
            }
 
            return $this->asJson(['down' => $downCount]);
        } catch (\Throwable $e) {
            Log::error('NavBadge status check failed: ' . $e->getMessage());
            return $this->asJson(['down' => 0]);
        }
    }
}
