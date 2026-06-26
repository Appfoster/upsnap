<?php

namespace appfoster\upsnap\services;

use Craft;
use craft\base\Component;
use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;

class ExpiryAlertService extends Component
{
    private const CACHE_KEY = 'upsnap_expiry_alerts';
    private const CACHE_DURATION = 3600;
    private const SSL_THRESHOLD_DAYS = 14;
    private const DOMAIN_THRESHOLD_DAYS = 30;
    private const FREE_PLAN_TYPES = ['free', 'trial'];

    public function getBannerPayload(): ?array
    {
        $settingsService = Upsnap::getInstance()->settingsService;

        $apiKey = $settingsService->getApiKey();
        if (!$apiKey) {
            return null;
        }

        $tokenStatus = $settingsService->getApiTokenStatus();
        if ($tokenStatus && $tokenStatus !== Constants::API_KEY_STATUS['active']) {
            return null;
        }

        $cacheKey = $this->getCacheKey($apiKey);
        $cached = Craft::$app->getCache()->get($cacheKey);
        if ($cached !== false) {
            return $cached === '__null__' ? null : $cached;
        }

        $payload = $this->fetchAndBuildPayload();

        Craft::$app->getCache()->set(
            $cacheKey,
            $payload ?? '__null__',
            self::CACHE_DURATION
        );

        return $payload;
    }

    public function invalidateCache(): void
    {
        $apiKey = Upsnap::getInstance()->settingsService->getApiKey();
        if ($apiKey) {
            Craft::$app->getCache()->delete($this->getCacheKey($apiKey));
        }
    }

    private function getCacheKey(string $apiKey): string
    {
        return self::CACHE_KEY . '_' . md5($apiKey);
    }

    private function fetchAndBuildPayload(): ?array
    {
        try {
            $billingResponse = Upsnap::getInstance()->apiService->get(
                Constants::MICROSERVICE_ENDPOINTS['billing']['status']
            );

            if (!is_array($billingResponse) || ($billingResponse['status'] ?? '') !== 'success') {
                return null;
            }

            $planName = strtolower((string)($billingResponse['data']['plan_name'] ?? 'free'));
            $isFreePlan = in_array($planName, self::FREE_PLAN_TYPES, true);

            if ($isFreePlan) {
                return [
                    'planTier'   => 'free',
                    'hash'       => 'free-plan-cta',
                    'alerts'     => [],
                    'upgradeUrl' => Constants::getWebAppUrl('webapp') . '/billing',
                ];
            }

            $response = Upsnap::getInstance()->apiService->get(
                Constants::MICROSERVICE_ENDPOINTS['monitors']['list']
            );

            if (!is_array($response) || ($response['status'] ?? null) !== 'success') {
                return null;
            }

            $data     = $response['data'] ?? [];
            $monitors = $data['monitors'] ?? $data;

            if (!is_array($monitors) || empty($monitors)) {
                return null;
            }

            $alerts = $this->extractAlerts($monitors);

            if (empty($alerts)) {
                return null;
            }

            return [
                'planTier'     => 'paid',
                'hash'         => $this->buildHash($alerts),
                'alerts'       => $alerts,
                'dashboardUrl' => Constants::getWebAppUrl('webapp'),
            ];
        } catch (\Throwable $e) {
            Craft::error('ExpiryAlertService fetch failed: ' . $e->getMessage(), __METHOD__);
            return null;
        }
    }

    private function extractAlerts(array $monitors): array
    {
        $alerts        = [];
        $dashboardBase = Constants::getWebAppUrl('webapp');

        foreach ($monitors as $monitor) {
            $id         = (string)($monitor['id']   ?? '');
            $name       = (string)($monitor['name'] ?? '');
            $monitorUrl = $id !== '' ? "{$dashboardBase}/monitors/{$id}" : $dashboardBase;
            $services   = $monitor['config']['services'] ?? [];

            $ssl         = $services['ssl'] ?? [];
            $sslThreshold = (int)($ssl['notify_days_before_expiry'] ?? self::SSL_THRESHOLD_DAYS);
            if (
                !empty($ssl['enabled']) &&
                isset($ssl['days_remaining']) &&
                (int)$ssl['days_remaining'] <= $sslThreshold
            ) {
                $alerts[] = [
                    'monitor_id'     => $id,
                    'monitor_name'   => $name,
                    'type'           => 'ssl',
                    'days_remaining' => (int)$ssl['days_remaining'],
                    'expires_at'     => $ssl['expires_at'] ?? null,
                    'dashboard_url'  => $monitorUrl,
                ];
            }

            $domain          = $services['domain'] ?? [];
            $domainThreshold = (int)($domain['notify_days_before_expiry'] ?? self::DOMAIN_THRESHOLD_DAYS);
            if (
                !empty($domain['enabled']) &&
                isset($domain['days_remaining']) &&
                (int)$domain['days_remaining'] <= $domainThreshold
            ) {
                $alerts[] = [
                    'monitor_id'     => $id,
                    'monitor_name'   => $name,
                    'type'           => 'domain',
                    'days_remaining' => (int)$domain['days_remaining'],
                    'expires_at'     => $domain['expires_at'] ?? null,
                    'dashboard_url'  => $monitorUrl,
                ];
            }
        }

        return $alerts;
    }

    private function buildHash(array $alerts): string
    {
        $ids = array_map(
            static fn(array $a): string => ($a['monitor_id'] ?? '') . ':' . ($a['type'] ?? ''),
            $alerts
        );
        sort($ids);
        return md5(implode(',', $ids));
    }
}
