<?php

namespace appfoster\upsnap;

use Craft;
use craft\base\Event;
use craft\base\Plugin;
use craft\web\UrlManager;
use craft\services\Plugins;
use craft\helpers\UrlHelper;
use craft\events\PluginEvent;
use craft\events\RegisterUrlRulesEvent;

use appfoster\upsnap\services\ApiService;
use appfoster\upsnap\services\HistoryService;
use appfoster\upsnap\services\SettingsService;

/**
 * @property ApiService $apiService
 * @property HistoryService $historyService
 * @property SettingsService $settingsService
 */
class Upsnap extends Plugin
{
    public static $plugin;

    public bool $hasCpSection;
    public bool $hasCpSettings;
    public string $schemaVersion;

    public function __construct($id, $parent = null, array $config = [])
    {
        $this->schemaVersion = Constants::PLUGIN_SCHEMA_VERSION;
        $this->hasCpSettings = true;
        $this->hasCpSection = true;

        parent::__construct($id, $parent, $config);
    }

    /**
     * Get the monitoring URL from settings
     */
    public static function getMonitoringUrl(): string|null
    {
        $plugin = self::getInstance();
        $settingsService = $plugin->settingsService;
        return $settingsService->getMonitoringUrl();
    }

    public function init()
    {
        parent::init();

        // Set alias for assets
        \Craft::setAlias('@upsnap', dirname(__DIR__)."/src");

        $this->setComponents([
            'apiService' => ApiService::class,
            'historyService' => HistoryService::class,
            'settingsService' => SettingsService::class
        ]);

        Event::on(
            Plugins::class,
            Plugins::EVENT_AFTER_LOAD_PLUGINS,
            function () {
                self::registerAfterLoadEvents();
            }
        );

        Event::on(
            Plugins::class,
            Plugins::EVENT_AFTER_INSTALL_PLUGIN,
            function (PluginEvent $event) {
                Craft::info('Upsnap plugin installed', __METHOD__);

                if ($event->plugin === $this) {
                    // Record installation data
                    try {
                        $siteUrl = Craft::$app->getSites()->getPrimarySite()?->baseUrl;
                        if ($siteUrl) {
                            $this->apiService->recordInstallationData($siteUrl);
                        }
                    } catch (\Exception $e) {
                        Craft::error('Failed to record installation data: ' . $e->getMessage(), __METHOD__);
                    }

                    $request = Craft::$app->getRequest();
                    if ($request->isCpRequest) {
                        return $this->redirectToSettings()->send();
                    }
                }
            }
        );
    }

    private function registerAfterLoadEvents()
    {
        self::$plugin = $this;

        $this->_registerCpRoutes();
    }

    private function _registerCpRoutes()
    {
        Event::on(
            UrlManager::class,
            UrlManager::EVENT_REGISTER_CP_URL_RULES,
            function (RegisterUrlRulesEvent $event) {
                $event->rules = array_merge($event->rules, [
                    'upsnap' => 'upsnap/dashboard/index',

                    // Health Check Routes
                    Constants::SUBNAV_ITEM_REACHABILITY['url'] => 'upsnap/health-check/reachability',
                    // 'upsnap/reachability/history' => 'upsnap/health-check/reachability-history',
                    Constants::SUBNAV_ITEM_SECURITY_CERTIFICATES['url'] => 'upsnap/health-check/security-certificates',
                    Constants::SUBNAV_ITEM_BROKEN_LINKS['url'] => 'upsnap/health-check/broken-links',
                    Constants::SUBNAV_ITEM_LIGHTHOUSE['url'] => 'upsnap/health-check/lighthouse',
                    Constants::SUBNAV_ITEM_DOMAIN_CHECK['url'] => 'upsnap/health-check/domain-check',
                    Constants::SUBNAV_ITEM_MIXED_CONTENT['url'] => 'upsnap/health-check/mixed-content',
                    Constants::SUBNAV_ITEM_STATUS_PAGE['url'] => 'upsnap/status-page/index',


                    // Setting Route
                    Constants::SUBNAV_ITEM_SETTINGS['url'] => 'upsnap/settings/index',
                    'upsnap/monitors/new' => 'upsnap/monitors/new',
                    'upsnap/monitors/edit/<monitorId:[0-9a-fA-F\-]+>' => 'upsnap/monitors/edit',
                    'upsnap/monitors/detail/<monitorId:[0-9a-fA-F\-]+>' => 'upsnap/monitors/detail',
                    'upsnap/monitors/histogram/<monitorId:[0-9a-fA-F\-]+>' => 'upsnap/monitors/histogram-data',
                    'upsnap/monitors/response-time/<monitorId:[0-9a-fA-F\-]+>' => 'upsnap/monitors/response-time-data',
                    'upsnap/monitors/uptime-stats/<monitorId:[0-9a-fA-F\-]+>' => 'upsnap/monitors/uptime-stats-data',
                    'upsnap/monitors/uptime-stats' => 'upsnap/monitors/uptime-stats',

                    'upsnap/status-page/edit/<statusPageId:[0-9a-fA-F\-]+>' => 'upsnap/status-page/new',
                    'upsnap/status-page/new' => 'upsnap/status-page/new',
                    'upsnap/regions/list' => 'upsnap/regions/list',

                ]);
            }
        );
    }

    /**
     * @inheritdoc
     */
    public function getCpNavItem(): ?array
    {
        $item = parent::getCpNavItem();

        $item['subnav'] = Constants::SUBNAV_ITEM_LIST;

        return $item;
    }

    /**
     * @inheritdoc
     */
    public function getSettingsResponse(): mixed
    {
        // Just redirect to the plugin settings page
        return $this->redirectToSettings();
    }

    /**
     * @inheritdoc
     */
    private function redirectToSettings()
    {
        return Craft::$app->getResponse()->redirect(UrlHelper::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']));
    }
}
