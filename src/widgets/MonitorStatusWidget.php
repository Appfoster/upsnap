<?php
 
namespace appfoster\upsnap\widgets;
 
use CraftCms\Cms\Dashboard\Widgets\Widget;
use CraftCms\Cms\Support\Url;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use CraftCms\Cms\View\TemplateMode;
use appfoster\upsnap\Constants;
use appfoster\upsnap\assetbundles\MonitorStatusWidgetAsset;
use Override;
use function CraftCms\Cms\t;
use function CraftCms\Cms\template;
 
class MonitorStatusWidget extends Widget
{
    #[Override]
    public static function displayName(): string
    {
        return t('upsnap', 'UpSnap Monitor Status');
    }
 
    #[Override]
    public static function icon(): ?string
    {
        return dirname(__DIR__) . '/icon.svg';
    }
 
    #[Override]
    public function getBodyHtml(): ?string
    {
        app(InternalAssetRegistry::class)->register(MonitorStatusWidgetAsset::class);
 
        return template('upsnap/_widgets/monitor-status', [
            'endpoint' => Url::actionUrl('upsnap/monitors/widget-status'),
            'dashboardUrl' => Url::cpUrl('upsnap'),
            'monitorsUrl' => Url::cpUrl('upsnap/monitors'),
            'settingsUrl' => Url::cpUrl('upsnap/settings'),
            'upgradeUrl' => Constants::getWebAppUrl('webapp') . '/billing',
        ], templateMode: TemplateMode::Cp);
    }
}
