<?php
namespace appfoster\upsnap\assetbundles;

use CraftCms\Cms\View\HtmlStack;

class DashboardAsset extends BaseAsset
{
    public function register(HtmlStack $htmlStack): void
    {
        parent::register($htmlStack);

        $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/css/dashboard.css'));
        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/dashboard.js'));
    }
}