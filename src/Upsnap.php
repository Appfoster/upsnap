<?php

namespace appfoster\upsnap;

use Craft;
use craft\base\Event;
use craft\base\Plugin;
use craft\web\UrlManager;
use craft\services\Plugins;
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

    public bool $hasCpSection = true;
    public bool $hasCpSettings = true;
    public string $schemaVersion = '1.0.0';

    /**
     * Get the monitoring URL from settings
     */
    public static function getMonitoringUrl(): string
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
                    $request = Craft::$app->getRequest();
                    if ($request->isCpRequest) {
                        Craft::info('Upsnap plugin redirect url will be set', __METHOD__);
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

                    // Setting Route
                    Constants::SUBNAV_ITEM_SETTINGS['url'] => 'upsnap/settings/index',
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
}
