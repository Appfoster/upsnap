<?php

namespace appfoster\upsnap\assetbundles;

use craft\web\AssetBundle;
use appfoster\upsnap\Constants;
use craft\web\assets\cp\CpAsset;

class NavBadgeAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = Constants::ASSET_SOURCE_PATH;

        $this->depends = [
            CpAsset::class,
        ];

        $this->css = [
            'css/global.css',
        ];

        $this->js = [
            'js/nav-badge.js',
        ];

        parent::init();
    }
}
