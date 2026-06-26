<?php

namespace appfoster\upsnap;

use Craft;
use craft\base\Event;
use craft\base\Plugin;
use craft\events\TemplateEvent;
use craft\web\UrlManager;
use craft\web\View;
use craft\services\Dashboard;
use craft\services\Plugins;
use craft\helpers\UrlHelper;
use craft\events\PluginEvent;
use craft\events\RegisterComponentTypesEvent;
use craft\events\RegisterUrlRulesEvent;
use craft\web\twig\variables\CraftVariable;
use GuzzleHttp\Client;

use appfoster\upsnap\services\ApiService;
use appfoster\upsnap\services\ExpiryAlertService;
use appfoster\upsnap\services\HistoryService;
use appfoster\upsnap\services\SettingsService;
use appfoster\upsnap\variables\UpsnapVariable;
use appfoster\upsnap\widgets\MonitorStatusWidget;

/**
 * @property ApiService $apiService
 * @property ExpiryAlertService $expiryAlertService
 * @property HistoryService $historyService
 * @property SettingsService $settingsService
 */
class Upsnap extends Plugin
{
    public static $plugin;
    private bool $expiryAlertBannerRegistered = false;

    public bool $hasCpSection;
    public bool $hasCpSettings;
    public string $schemaVersion;

    private ?string $_apiKeyBeforeUninstall = null;

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
        \Craft::setAlias('@upsnapRoot', dirname(__DIR__));

        $this->setComponents([
            'apiService' => ApiService::class,
            'expiryAlertService' => ExpiryAlertService::class,
            'historyService' => HistoryService::class,
            'settingsService' => SettingsService::class
        ]);

        Event::on(
            CraftVariable::class,
            CraftVariable::EVENT_INIT,
            function (\yii\base\Event $event) {
                $event->sender->set('upsnap', UpsnapVariable::class);
            }
        );

        Event::on(
            Plugins::class,
            Plugins::EVENT_AFTER_LOAD_PLUGINS,
            function () {
                self::registerAfterLoadEvents();
            }
        );

        Event::on(
            View::class,
            View::EVENT_BEFORE_RENDER_TEMPLATE,
            function (TemplateEvent $event) {
                $this->registerExpiryAlertBanner();
            }
        );

        Event::on(
            Dashboard::class,
            Dashboard::EVENT_REGISTER_WIDGET_TYPES,
            function (RegisterComponentTypesEvent $event) {
                $event->types[] = MonitorStatusWidget::class;
            }
        );

        Event::on(
            Plugins::class,
            Plugins::EVENT_AFTER_INSTALL_PLUGIN,
            function (PluginEvent $event) {
                if ($event->plugin === $this) {
                    try {
                        $siteUrl = self::getMonitoringUrl() ?? Craft::$app->getSites()->getPrimarySite()->getBaseUrl();
                        $currentUser = Craft::$app instanceof \craft\web\Application ? Craft::$app->getUser()->getIdentity() : null;
                        $email = $currentUser?->email ?? null;
                        $name = ($currentUser?->fullName ?: $currentUser?->username) ?? null;
                        $craftInstallId = Craft::$app->getInfo()->id;

                        $this->apiService->recordInstallationData($siteUrl, $email, $name, $craftInstallId);
                    } catch (\Exception $e) {
                        Craft::error('Failed to record installation data: ' . $e->getMessage(), __METHOD__);
                    }

                    $request = Craft::$app->getRequest();
                    if ($request->isCpRequest) {
                        if ($this->settingsService->getApiKey() && $this->settingsService->getMonitorId() === null) {
                            try {
                                $sites = $this->settingsService->getAllCraftSites();
                                $sitesWithUrl = array_filter($sites, fn($s) => $s['hasUrl']);
                                if (count($sitesWithUrl) > 1) {
                                    return Craft::$app->getResponse()->redirect(
                                        UrlHelper::cpUrl(Constants::SUBNAV_ITEM_MULTISITE_SETUP['url'])
                                    )->send();
                                }
                            } catch (\Throwable $e) {
                                Craft::warning('Could not check sites for multisite redirect on install: ' . $e->getMessage(), __METHOD__);
                            }
                        }
                        return $this->redirectToSettings()->send();
                    }
                }
            }
        );
    }

    private function registerExpiryAlertBanner(): void
    {
        if ($this->expiryAlertBannerRegistered) {
            return;
        }

        $this->expiryAlertBannerRegistered = true;

        try {
            $request = Craft::$app->getRequest();

            if (!$request->getIsCpRequest() || $request->getIsAjax()) {
                return;
            }

            $user = Craft::$app->getUser()->getIdentity();
            if (!$user || !$user->admin) {
                return;
            }

            $payload = $this->expiryAlertService->getBannerPayload();
            if (!$payload) {
                return;
            }

            $dismissedHash = Craft::$app->getSession()->get('upsnapExpiryAlertDismissedHash');
            if ($dismissedHash === ($payload['hash'] ?? null)) {
                return;
            }

            \appfoster\upsnap\assetbundles\ExpiryAlertAsset::register(Craft::$app->getView());
            Craft::$app->getView()->registerJs('window.UpsnapExpiryAlert = ' . json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP) . ';', View::POS_HEAD);
        } catch (\Throwable $e) {
            Craft::error('Failed to register expiry alert banner: ' . $e->getMessage(), __METHOD__);
        }
    }

    public function beforeUninstall(): void
    {
        parent::beforeUninstall();
        $this->_apiKeyBeforeUninstall = $this->settingsService->getApiKey();
    }

    public function afterUninstall(): void
    {
        parent::afterUninstall();

        try {
            $craftInstallId = Craft::$app->getInfo()->id;
            if (!$craftInstallId) {
                return;
            }
            $headers = ['Accept' => 'application/json', 'X-Requested-From' => 'craft'];
            if ($this->_apiKeyBeforeUninstall) {
                $headers['Authorization'] = 'Bearer ' . $this->_apiKeyBeforeUninstall;
            }

            $url = Constants::getAPIBaseUrl() . '/admin/v1/installation-data/' . rawurlencode((string) $craftInstallId);
            $client = new Client(['http_errors' => false, 'timeout' => Constants::API_TIMEOUT]);
            $client->patch($url, [
                'headers' => $headers,
                'json' => ['status' => 'uninstalled', 'uninstalled_at' => gmdate('c')],
            ]);
        } catch (\Throwable $e) {
            Craft::error('Failed to record uninstall data: ' . $e->getMessage(), __METHOD__);
        }
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

                    // Health Check Routes - commented out as user can navigate from the dashboard cards.
                    Constants::SUBNAV_ITEM_REACHABILITY['url'] => 'upsnap/health-check/reachability',
                    // 'upsnap/reachability/history' => 'upsnap/health-check/reachability-history',
                    Constants::SUBNAV_ITEM_SECURITY_CERTIFICATES['url'] => 'upsnap/health-check/security-certificates',
                    Constants::SUBNAV_ITEM_BROKEN_LINKS['url'] => 'upsnap/health-check/broken-links',
                    Constants::SUBNAV_ITEM_LIGHTHOUSE['url'] => 'upsnap/health-check/lighthouse',
                    Constants::SUBNAV_ITEM_DOMAIN_CHECK['url'] => 'upsnap/health-check/domain-check',
                    Constants::SUBNAV_ITEM_MIXED_CONTENT['url'] => 'upsnap/health-check/mixed-content',
                    Constants::SUBNAV_ITEM_STATUS_PAGE['url'] => 'upsnap/status-page/index',

                    // Monitors & Notification Channels Routes
                    Constants::SUBNAV_ITEM_MONITORS['url'] => 'upsnap/monitors/index',
                    Constants::SUBNAV_ITEM_NOTIFICATION_CHANNELS['url'] => 'upsnap/notification-channels/index',

                    // Setting Route
                    Constants::SUBNAV_ITEM_SETTINGS['url'] => 'upsnap/settings/index',
                    Constants::SUBNAV_ITEM_MULTISITE_SETUP['url'] => 'upsnap/settings/multi-site-setup',
                    'upsnap/settings/bulk-create-monitors' => 'upsnap/settings/bulk-create-monitors',
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

                    // Alert Routes
                    'upsnap/alerts/dismiss' => 'upsnap/alerts/dismiss',

                    // Incidents Routes
                    Constants::SUBNAV_ITEM_INCIDENTS['url'] => 'upsnap/incidents/index',
                    'upsnap/incidents/list'                              => 'upsnap/incidents/list',
                    'upsnap/incidents/export'                            => 'upsnap/incidents/export',
                    'upsnap/incidents/detail'                            => 'upsnap/incidents/detail',
                    'upsnap/incidents/<incidentId:\d+>'                  => 'upsnap/incidents/view',

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
        $url = UrlHelper::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']);
        if (!$this->settingsService->getApiKey()) {
            $url .= '#register-signin-tab';
        }
        return Craft::$app->getResponse()->redirect($url);
    }
}
