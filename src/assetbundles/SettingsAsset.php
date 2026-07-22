<?php
namespace appfoster\upsnap\assetbundles;

use CraftCms\Cms\View\HtmlStack;

class SettingsAsset extends BaseAsset
{
    public function register(HtmlStack $htmlStack): void
    {
        parent::register($htmlStack);

        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/settings.js'));
        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/monitors.js'));
        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/monitorsTable.js'));
        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/notificationChannels.js'));
        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/signupInlineProgress.js'));
        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/verificationBanner.js'));
        $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/css/addMonitorModal.css'));
        $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/css/notification-channels.css'));
        $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/css/signupInlineProgress.css'));
        $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/css/verificationBanner.css'));
    }
}