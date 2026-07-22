<?php

namespace appfoster\upsnap;

use CraftCms\Cms\Plugin\Plugin;
use GuzzleHttp\Client;

use appfoster\upsnap\services\ApiService;
use appfoster\upsnap\services\ExpiryAlertService;
use appfoster\upsnap\services\HistoryService;
use appfoster\upsnap\services\SettingsService;
use appfoster\upsnap\services\RecheckService;

use CraftCms\Cms\Cp\Data\NavItem;
use Illuminate\Support\Facades\Event;
use CraftCms\Cms\Element\Events\ElementSaved;
use CraftCms\Cms\Entry\Elements\Entry;

/**
 * @property ApiService $apiService
 * @property ExpiryAlertService $expiryAlertService
 * @property HistoryService $historyService
 * @property SettingsService $settingsService
 * @property RecheckService $recheckService
 */
class Upsnap extends Plugin
{
    public static $plugin;
    private bool $expiryAlertBannerRegistered = false;

    public bool $hasCpSection = true;
    public bool $hasCpSettings = true;
    public string $schemaVersion = Constants::PLUGIN_SCHEMA_VERSION;

    private ?string $_apiKeyBeforeUninstall = null;

    public function getCpNavItem(): ?NavItem
    {
        $item = parent::getCpNavItem();

        if ($item) {
            $item->subnav(array_map(
                fn ($subItemConfig) => new NavItem($subItemConfig),
                Constants::SUBNAV_ITEM_LIST
            ));
        }

        return $item;
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

    public function registerPlugin(): void
    {
        $this->app->singleton(ApiService::class, fn() => new ApiService());
        $this->app->singleton(ExpiryAlertService::class, fn() => new ExpiryAlertService());
        $this->app->singleton(HistoryService::class, fn() => new HistoryService());
        $this->app->singleton(SettingsService::class, fn() => new SettingsService());
        $this->app->singleton(RecheckService::class, fn() => new RecheckService());
    }

    public function bootPlugin(): void
    {
        self::$plugin = $this;

        $this->publishes([
            __DIR__ . '/assetbundles/dist' => public_path('vendor/appfoster/upsnap/dist'),
            dirname(__DIR__) . '/assets' => public_path('vendor/appfoster/upsnap/assets'),
            dirname(__DIR__) . '/resources' => public_path('vendor/appfoster/upsnap/resources'),
        ], 'upsnap-assets');

        // Register custom Twig variables
        \CraftCms\Cms\Twig\Variables\CraftVariable::macro('upsnap', function () {
            return new \appfoster\upsnap\variables\UpsnapVariable();
        });

        // Register ElementSaved event to trigger on-demand rechecks
        Event::listen(ElementSaved::class, function (ElementSaved $event) {
            if ($event->element instanceof Entry) {
                $this->recheckService->triggerRecheckForEntry($event->element);
            }
        });
    }

    public function __get(string $name)
    {
        $services = [
            'apiService' => ApiService::class,
            'expiryAlertService' => ExpiryAlertService::class,
            'historyService' => HistoryService::class,
            'settingsService' => SettingsService::class,
            'recheckService' => RecheckService::class,
        ];

        if (isset($services[$name])) {
            return $this->app->make($services[$name]);
        }

        if (property_exists($this, $name)) {
            return $this->{$name};
        }

        $trace = debug_backtrace();
        trigger_error(
            'Undefined property: ' . static::class . '::$' . $name .
            ' in ' . $trace[0]['file'] .
            ' on line ' . $trace[0]['line'],
            E_USER_NOTICE
        );
        return null;
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
            $craftInstallId = \CraftCms\Cms\Cms::systemUid();
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
            \Illuminate\Support\Facades\Log::error('Failed to record uninstall data: ' . $e->getMessage());
        }
    }
}
