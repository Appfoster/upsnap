<?php

namespace appfoster\upsnap\services;

use appfoster\upsnap\Upsnap;
use CraftCms\Cms\Entry\Elements\Entry;
use CraftCms\Cms\Support\Facades\Sites;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RecheckService
{
    const CACHE_PREFIX = 'upsnap_recheck_last_';
    const RATE_LIMIT_SECONDS = 60;

    public function triggerRecheckForEntry(Entry $entry): void
    {
        Log::info('RecheckService: hook fired for entry ' . $entry->id);

        if (!$this->isEnabled()) {
            Log::info('RecheckService: skipped - onDemandRecheckEnabled is off');
            return;
        }

        if (!$this->isPlanSupported()) {
            return;
        }

        if (!$entry->enabled) {
            Log::info('RecheckService: skipped - entry ' . $entry->id . ' is not enabled (draft)');
            return;
        }

        $sites = $entry->getSiteIds();
        Log::info('RecheckService: entry ' . $entry->id . ' is enabled, checking ' . count($sites) . ' site(s)');

        $monitors = [];
        try {
            $monitorsResult = Upsnap::getInstance()->settingsService->getPrimaryMonitorOptions();
            if ($monitorsResult['success'] ?? false) {
                $monitors = $monitorsResult['monitorOptions'] ?? [];
            }
        } catch (\Throwable $e) {
            Log::error("RecheckService: failed to fetch monitor options: " . $e->getMessage());
        }

        foreach ($sites as $siteId) {
            if ($entry->enabledForSite($siteId)) {
                $this->triggerRecheckForSite($siteId, $monitors);
            }
        }
    }

    private function isEnabled(): bool
    {
        return (bool)Upsnap::getInstance()->settingsService->getSetting('onDemandRecheckEnabled', true);
    }

    private function isPlanSupported(): bool
    {
        $apiKey = Upsnap::getInstance()->settingsService->getApiKey();
        if (!$apiKey) {
            Log::info('RecheckService: skipped - no API key configured in plugin settings');
            return false;
        }

        $supported = Upsnap::getInstance()->settingsService->isProPlanOrAbove();
        if (!$supported) {
            Log::info('RecheckService: skipped - account plan is not Pro or Agency');
        }
        return $supported;
    }

    private function triggerRecheckForSite(int $siteId, array $monitors): void
    {
        $cacheKey = self::CACHE_PREFIX . $siteId;

        if (Cache::get($cacheKey, false)) {
            return;
        }

        $monitor = $this->getMonitorForSite($siteId, $monitors);
        if (!$monitor) {
            Log::info('RecheckService: skipped - no UpSnap monitor found for site ' . $siteId);
            return;
        }

        try {
            $this->callRecheckApi($monitor['id']);

            Cache::put($cacheKey, true, self::RATE_LIMIT_SECONDS);
            Log::info("On-demand recheck triggered for monitor {$monitor['id']} (site: {$siteId})");
        } catch (\Throwable $e) {
            Log::error("Failed to trigger recheck for site {$siteId}: {$e->getMessage()}");
        }
    }

    private function getMonitorForSite(int $siteId, array $monitors): ?array
    {
        $site = Sites::getSiteById($siteId);
        if (!$site) {
            return null;
        }

        $siteUrl = $site->getBaseUrl();
        if (!$siteUrl) {
            return null;
        }

        foreach ($monitors as $monitor) {
            if (($monitor['monitoringUrl'] ?? '') === $siteUrl) {
                return $monitor;
            }
        }

        return null;
    }

    private function callRecheckApi(string $monitorId): void
    {
        $endpoint = 'user/monitors/' . $monitorId . '/recheck';
        Upsnap::getInstance()->apiService->post($endpoint, []);
    }
}
