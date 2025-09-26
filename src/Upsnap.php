<?php

namespace appfoster\upsnap;

use Craft;
use craft\base\Event;
use craft\base\Plugin;
use craft\helpers\App;
use craft\web\UrlManager;
use craft\services\Plugins;
use craft\events\PluginEvent;
use craft\events\RegisterUrlRulesEvent;

use appfoster\upsnap\models\Settings;
use appfoster\upsnap\services\ApiService;
use appfoster\upsnap\services\HistoryService;

/**
 * @property ApiService $apiService
 * @property HistoryService $historyService
 */
class Upsnap extends Plugin
{
    public static $plugin;

    public bool $hasCpSection = true;
    public bool $hasCpSettings = true;
    public string $schemaVersion = '1.0.0';
    public static string $healthCheckUrl;

    /**
     * @inheritdoc
     */
    // protected function createSettingsModel(): Settings
    // {
    //     return new Settings();
    // }

    /**
     * @inheritdoc
     */
    protected function settingsHtml(): ?string
    {
        return Craft::$app->view->renderTemplate(
            'upsnap/_settings',
            [
                'settings' => $this->getSettings(),
                'plugin' => $this,
            ]
        );
    }

    public function init()
    {
        parent::init();

        self::$healthCheckUrl = App::env('SITE_MONITOR_URL') ?: '';

        // Removed global asset bundle registration - each page registers its own now

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
                    'upsnap/reachability' => 'upsnap/reachability/index',
                    'upsnap/reachability/history' => 'upsnap/reachability/history',
                    'upsnap/security-certificates' => 'upsnap/security-certificates/index',
                    'upsnap/settings' => 'upsnap/settings/index',
                    'upsnap/broken-links' => 'upsnap/broken-links/index',
                    'upsnap/lighthouse' => 'upsnap/lighthouse/index',
                    'upsnap/domain-check' => 'upsnap/domain-check/index',
                    'upsnap/mixed-content' => 'upsnap/mixed-content/index',
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
            // 'dashboard' => [
            //     'label' => Craft::t('upsnap', 'Dashboard'),
            //     'url' => 'upsnap'
            // ],
            'reachability' => [
                'label' => Craft::t('upsnap', 'Reachability'),
                'url' => 'upsnap/reachability'
            ],
            'security-certificates' => [
                'label' => Craft::t('upsnap', 'Security Certificates'),
                'url' => 'upsnap/security-certificates'
            ],
            'broken-links' => [
                'label' => Craft::t('upsnap', 'Broken Links'),
                'url' => 'upsnap/broken-links'
            ],
            'lighthouse' => [
                'label' => Craft::t('upsnap', 'Lighthouse'),
                'url' => 'upsnap/lighthouse'
            ],
            'domain-check' => [
                'label' => Craft::t('upsnap', 'Domain Check'),
                'url' => 'upsnap/domain-check'
            ],
            'mixed-content' => [
                'label' => Craft::t('upsnap', 'Mixed Content'),
                'url' => 'upsnap/mixed-content'
            ],
            // 'settings' => [
            //     'label' => Craft::t('upsnap', 'Settings'),
            //     'url' => 'upsnap/settings'
            // ],
        ];

        return $item;
    }
}
