<?php

namespace appfoster\upsnap\variables;

use Craft;
use yii\base\Behavior;
use appfoster\upsnap\Upsnap;

class UpsnapVariable extends Behavior
{
    private const CACHE_TTL      = 60;
    private const LIST_CACHE_KEY = 'upsnap_twig_monitors';

    public function status(string $identifier): array
    {
        if (!Upsnap::getInstance()->settingsService->getApiKey()) {
            return $this->unknownStatus();
        }

        $cacheKey = 'upsnap_twig_status_' . md5($identifier);

        return Craft::$app->getCache()->getOrSet($cacheKey, function () use ($identifier) {
            return $this->resolveStatus($identifier);
        }, self::CACHE_TTL);
    }

    public function allStatuses(): array
    {
        if (!Upsnap::getInstance()->settingsService->getApiKey()) {
            return [];
        }

        return Craft::$app->getCache()->getOrSet('upsnap_twig_all_statuses', function () {
            $monitors = $this->fetchMonitorList();
            return array_values(array_map(fn($m) => $this->buildStatusObject($m), $monitors));
        }, self::CACHE_TTL);
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
        return Craft::$app->getCache()->getOrSet(self::LIST_CACHE_KEY, function () {
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
                Craft::warning('UpsnapVariable: monitor list fetch failed: ' . $e->getMessage(), __METHOD__);
                return [];
            }
        }, self::CACHE_TTL);
    }

    private function fetchUptimePercent(string $monitorId): ?float
    {
        $cacheKey = 'upsnap_twig_uptime_' . $monitorId;

        return Craft::$app->getCache()->getOrSet($cacheKey, function () use ($monitorId) {
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
                Craft::warning('UpsnapVariable: uptime stats fetch failed for ' . $monitorId . ': ' . $e->getMessage(), __METHOD__);
                return null;
            }
        }, self::CACHE_TTL);
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
        if (($monitor['id'] ?? '') === $identifier) {
            return true;
        }

        return $this->slugify($monitor['name'] ?? '') === strtolower(trim($identifier));
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
