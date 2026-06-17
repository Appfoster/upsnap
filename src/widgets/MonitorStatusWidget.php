<?php

namespace appfoster\upsnap\widgets;

use Craft;
use craft\base\Widget;
use craft\helpers\UrlHelper;
use appfoster\upsnap\Constants;
use appfoster\upsnap\assetbundles\MonitorStatusWidgetAsset;

class MonitorStatusWidget extends Widget
{
    public static function displayName(): string
    {
        return Craft::t('upsnap', 'UpSnap Monitor Status');
    }

    public static function icon(): ?string
    {
        return Craft::getAlias('@upsnap/icon.svg');
    }

    public function getBodyHtml(): ?string
    {
        MonitorStatusWidgetAsset::register(Craft::$app->getView());

        return Craft::$app->getView()->renderTemplate('upsnap/_widgets/monitor-status', [
            'endpoint' => UrlHelper::actionUrl('upsnap/monitors/widget-status'),
            'dashboardUrl' => UrlHelper::cpUrl('upsnap'),
            'monitorsUrl' => UrlHelper::cpUrl('upsnap/monitors'),
            'settingsUrl' => UrlHelper::cpUrl('upsnap/settings'),
            'upgradeUrl' => Constants::getWebAppUrl('webapp'),
        ]);
    }
}
