<?php
namespace appfoster\upsnap\assetbundles;

use craft\web\AssetBundle;
use appfoster\upsnap\Constants;

class DashboardAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = Constants::ASSET_SOURCE_PATH;

        $this->depends = [
            BaseAsset::class,
        ];

        $this->css = [
            'css/dashboard.css',
        ];

        $this->js = [
            'js/dashboard.js',
        ];

        parent::init();
    }
}