<?php

namespace appfoster\upsnap\services;

use Craft;
use yii\base\Component;
use craft\elements\Entry;
use appfoster\upsnap\Upsnap;

class RecheckService extends Component
{
    const CACHE_PREFIX = 'upsnap_recheck_last_';
    const RATE_LIMIT_SECONDS = 60;

    public function triggerRecheckForEntry(Entry $entry): void
    {
        Craft::info('RecheckService: hook fired for entry ' . $entry->id, __METHOD__);

        if (!$this->isEnabled()) {
            Craft::info('RecheckService: skipped - onDemandRecheckEnabled is off', __METHOD__);
            return;
        }

        if (!$this->isPlanSupported()) {
            return;
        }

        if (!$entry->enabled) {
            Craft::info('RecheckService: skipped - entry ' . $entry->id . ' is not enabled (draft)', __METHOD__);
            return;
        }

        $sites = $entry->getSiteIds();
        Craft::info('RecheckService: entry ' . $entry->id . ' is enabled, checking ' . count($sites) . ' site(s)', __METHOD__);
        foreach ($sites as $siteId) {
            if ($entry->enabledForSite($siteId)) {
                $this->triggerRecheckForSite($siteId);
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
            Craft::info('RecheckService: skipped - no API key configured in plugin settings', __METHOD__);
            return false;
        }

        $supported = Upsnap::getInstance()->settingsService->isProPlanOrAbove();
        if (!$supported) {
            Craft::info('RecheckService: skipped - account plan is not Pro or Agency', __METHOD__);
        }
        return $supported;
    }

    private function triggerRecheckForSite(int $siteId): void
    {
        $cacheKey = self::CACHE_PREFIX . $siteId;

        if (Craft::$app->getCache()->get($cacheKey)) {
            return;
        }

        $monitor = $this->getMonitorForSite($siteId);
        if (!$monitor) {
            Craft::info('RecheckService: skipped - no UpSnap monitor found for site ' . $siteId, __METHOD__);
            return;
        }

        try {
            $this->callRecheckApi($monitor['id']);

            Craft::$app->getCache()->set($cacheKey, true, self::RATE_LIMIT_SECONDS);
            Craft::info("On-demand recheck triggered for monitor {$monitor['id']} (site: {$siteId})", __METHOD__);
        } catch (\Throwable $e) {
            Craft::error("Failed to trigger recheck for site {$siteId}: {$e->getMessage()}", __METHOD__);
        }
    }

    private function getMonitorForSite(int $siteId): ?array
    {
        $site = Craft::$app->getSites()->getSiteById($siteId);
        if (!$site) {
            return null;
        }

        $siteUrl = $site->getBaseUrl();
        if (!$siteUrl) {
            return null;
        }

        try {
            $monitors = Upsnap::getInstance()->settingsService->getPrimaryMonitorOptions();

            if (!($monitors['success'] ?? false)) {
                return null;
            }

            $options = $monitors['monitorOptions'] ?? [];
            foreach ($options as $monitor) {
                if (($monitor['monitoringUrl'] ?? '') === $siteUrl) {
                    return $monitor;
                }
            }
        } catch (\Throwable $e) {
            Craft::error("Failed to fetch monitors for site {$siteId}: {$e->getMessage()}", __METHOD__);
        }

        return null;
    }

    private function callRecheckApi(string $monitorId): void
    {
        $endpoint = 'user/monitors/' . $monitorId . '/recheck';
        Upsnap::getInstance()->apiService->post($endpoint, []);
    }
}
