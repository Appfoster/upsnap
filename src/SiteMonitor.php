<?php

namespace appfoster\sitemonitor;

use appfoster\sitemonitor\assetbundles\monitor\MonitorAsset;
use appfoster\sitemonitor\services\ApiService;
use Craft;
use craft\base\Event;
use craft\base\Plugin;
use craft\web\UrlManager;
use craft\services\Plugins;
use craft\events\PluginEvent;
use craft\events\RegisterUrlRulesEvent;
use appfoster\sitemonitor\base\PluginTrait;
use appfoster\sitemonitor\models\Settings;
use appfoster\sitemonitor\services\HistoryService;
use craft\helpers\App;

/**
 * @property ApiService $apiService
 * @property HistoryService $historyService
 */
class SiteMonitor extends Plugin
{
    use PluginTrait;

    public static $plugin;
    public static $view;

    public bool $hasCpSection = true;
    public bool $hasCpSettings = true;
    public string $schemaVersion = '1.0.0';
    public static string $healthCheckUrl;


    /**
     * @inheritdoc
     */
    protected function createSettingsModel(): ?Settings
    {
        return new Settings();
    }

    /**
     * @inheritdoc
     */
    protected function settingsHtml(): ?string
    {
        return Craft::$app->view->renderTemplate(
            'site-monitor/_settings',
            [
                'settings' => $this->getSettings(),
                'plugin' => $this,
            ]
        );
    }

    public function init()
    {
        parent::init();

        self::$healthCheckUrl = App::env('SITE_MONITOR_URL');
        if (Craft::$app->getRequest()->getIsCpRequest()) {
            Craft::$app->getView()->registerAssetBundle(MonitorAsset::class);
        }

        $this->setComponents([
            'apiService' => ApiService::class,
            'historyService' => HistoryService::class
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
                Craft::info('Website Monitor plugin installed', __METHOD__);

                if ($event->plugin === $this) {
                    $request = Craft::$app->getRequest();
                    if ($request->isCpRequest) {
                        Craft::info('Website Monitor plugin redirect url will be set', __METHOD__);
                    }
                }
            }
        );
    }

    private function registerAfterLoadEvents()
    {
        self::$plugin = $this;
        self::$view = Craft::$app->getView();

        $this->_registerCpRoutes();
    }

    private function _registerCpRoutes()
    {
        Event::on(
            UrlManager::class,
            UrlManager::EVENT_REGISTER_CP_URL_RULES,
            function (RegisterUrlRulesEvent $event) {
                $event->rules = array_merge($event->rules, [
                    'site-monitor' => 'site-monitor/dashboard/index',
                    'site-monitor/reachability' => 'site-monitor/reachability/index',
                    'site-monitor/reachability/history' => 'site-monitor/reachability/history',
                    'site-monitor/security-certificates' => 'site-monitor/security-certificates/index',
                    'site-monitor/settings' => 'site-monitor/settings/index',
                    'site-monitor/broken-links' => 'site-monitor/broken-links/index',
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

        $item['subnav'] = [
            'dashboard' => [
                'label' => Craft::t('site-monitor', 'Dashboard'),
                'url' => 'site-monitor'
            ],
            'reachability' => [
                'label' => Craft::t('site-monitor', 'Reachability'),
                'url' => 'site-monitor/reachability'
            ],
            'security-certificates' => [
                 'label' => Craft::t('site-monitor', 'Security Certificates'),
                 'url' => 'site-monitor/security-certificates'
            ],
            'broken-links' => [
                 'label' => Craft::t('site-monitor', 'Broken Links'),
                 'url' => 'site-monitor/broken-links'
            ],
            'settings' => [
                'label' => Craft::t('site-monitor', 'Settings'),
                'url' => 'site-monitor/settings'
            ],
        ];

        return $item;
    }
}
