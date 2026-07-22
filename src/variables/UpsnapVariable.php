<?php
 
namespace appfoster\upsnap\variables;
 
use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;
use Illuminate\Support\Facades\Log;
 
class UpsnapVariable
{
    private const CACHE_TTL      = 60;
    private const LIST_CACHE_KEY = 'upsnap_twig_monitors';
 
    public function status(string $identifier): array
    {
        if (!Upsnap::getInstance()->settingsService->getApiKey()) {
            return $this->unknownStatus();
        }
 
        if (!$this->isProOrAbove()) {
            return $this->unknownStatus();
        }
 
        $normalized = strtolower(trim($identifier));
        $cacheKey = 'upsnap_twig_status_' . md5($normalized);
 
        return cache()->remember($cacheKey, self::CACHE_TTL, function () use ($normalized) {
            return $this->resolveStatus($normalized);
        });
    }
 
    public function allStatuses(): array
    {
        if (!Upsnap::getInstance()->settingsService->getApiKey()) {
            return [];
        }
 
        if (!$this->isProOrAbove()) {
            return [];
        }
 
        return cache()->remember('upsnap_twig_all_statuses', self::CACHE_TTL, function () {
            $monitors = $this->fetchMonitorList();
            return array_values(array_map(fn($m) => $this->buildStatusObject($m), $monitors));
        });
    }
 
    private function resolveStatus(string $identifier): array
    {
        foreach ($this->fetchMonitorList() as $monitor) {
            if (!$this->matchesIdentifier($monitor, $identifier)) {
                continue;
            }
 
            $status = $this->buildStatusObject($monitor);
 
            $monitorId = $monitor['id'] ?? null;
            if ($monitorId !== null) {
                $status['uptimePercent'] = $this->fetchUptimePercent((string) $monitorId);
            }
 
            return $status;
        }
 
        return $this->unknownStatus();
    }
 
    private function fetchMonitorList(): array
    {
        return cache()->remember(self::LIST_CACHE_KEY, self::CACHE_TTL, function () {
            try {
                $response = Upsnap::$plugin->apiService->get(
                    'user/monitors',
                    ['last_day_uptimes' => true]
                );
 
                if (!is_array($response) || ($response['status'] ?? '') !== 'success') {
                    return [];
                }
 
                return $response['data']['monitors'] ?? [];
            } catch (\Throwable $e) {
                Log::warning('UpsnapVariable: monitor list fetch failed: ' . $e->getMessage());
                return [];
            }
        });
    }
 
    private function fetchUptimePercent(string $monitorId): ?float
    {
        $cacheKey = 'upsnap_twig_uptime_' . $monitorId;
 
        return cache()->remember($cacheKey, self::CACHE_TTL, function () use ($monitorId) {
            try {
                $response = Upsnap::$plugin->apiService->get(
                    'user/monitors/' . $monitorId . '/uptime-stats',
                    ['uptime_stats_time_frames' => 'month']
                );
 
                if (!is_array($response) || ($response['status'] ?? '') !== 'success') {
                    return null;
                }
 
                $month = $response['data']['uptime_stats']['month'] ?? null;
                if (!is_array($month)) {
                    return null;
                }
 
                $pct = $month['uptime_percentage'] ?? $month['percentage'] ?? null;
                return $pct !== null ? (float) $pct : null;
            } catch (\Throwable $e) {
                Log::warning('UpsnapVariable: uptime stats fetch failed for ' . $monitorId . ': ' . $e->getMessage());
                return null;
            }
        });
    }
 
    private function buildStatusObject(array $monitor): array
    {
        $serviceType = $monitor['service_type'] ?? 'website';
        $serviceKey  = match ($serviceType) {
            'keyword' => 'keyword',
            'port'    => 'port_check',
            default   => 'uptime',
        };
 
        $rawStatus    = null;
        $lastChecked  = null;
        $responseTime = null;
 
        $primaryRegion = null;
        foreach ($monitor['regions'] ?? [] as $region) {
            if ($region['is_primary'] ?? false) {
                $primaryRegion = $region;
                break;
            }
        }
 
        if ($primaryRegion !== null) {
            $serviceCheck = ($monitor['service_last_checks'][$primaryRegion['id']] ?? [])[$serviceKey] ?? null;
 
            if ($serviceCheck !== null) {
                $rawStatus    = $serviceCheck['last_status'] ?? null;
                $responseTime = isset($serviceCheck['response_time_ms'])
                    ? (int) $serviceCheck['response_time_ms']
                    : null;
 
                $ts = $serviceCheck['last_checked_at'] ?? null;
                if ($ts !== null) {
                    try {
                        $lastChecked = new \DateTime($ts);
                    } catch (\Throwable) {
                        // leave null
                    }
                }
            }
        }
 
        $status = match ($rawStatus) {
            'up'       => 'up',
            'down'     => 'down',
            'degraded' => 'degraded',
            default    => 'unknown',
        };
 
        if (!($monitor['is_enabled'] ?? true)) {
            $status = 'unknown';
        }
 
        return [
            'id'            => $monitor['id'] ?? null,
            'name'          => $monitor['name'] ?? '',
            'status'        => $status,
            'lastChecked'   => $lastChecked,
            'responseTime'  => $responseTime,
            'uptimePercent' => null,
        ];
    }
 
    private function matchesIdentifier(array $monitor, string $identifier): bool
    {
        if ((string)($monitor['id'] ?? '') === trim($identifier)) {
            return true;
        }
 
        return $this->slugify($monitor['name'] ?? '') === strtolower(trim($identifier));
    }
 
    private function isProOrAbove(): bool
    {
        return (bool) cache()->remember('upsnap_twig_plan_check', self::CACHE_TTL, function () {
            try {
                $response = Upsnap::$plugin->apiService->get(Constants::MICROSERVICE_ENDPOINTS['billing']['status']);
                if (!is_array($response) || ($response['status'] ?? '') !== 'success') {
                    return false;
                }
                $planName = strtolower((string)($response['data']['plan_name'] ?? 'free'));
                return !in_array($planName, ['free', 'trial'], true);
            } catch (\Throwable $e) {
                Log::warning('UpsnapVariable: billing check failed: ' . $e->getMessage());
                return false;
            }
        });
    }
 
    private function slugify(string $name): string
    {
        return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-');
    }
 
    private function unknownStatus(): array
    {
        return [
            'id'            => null,
            'name'          => '',
            'status'        => 'unknown',
            'lastChecked'   => null,
            'responseTime'  => null,
            'uptimePercent' => null,
        ];
    }
}
