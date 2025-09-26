<?php
namespace appfoster\upsnap\assetbundles\upsnap;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class CommonAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/upsnap/dist";

        $this->depends = [
            CpAsset::class,
        ];

        $this->css = [
            'css/monitor.css',
        ];

        $this->js = [
            'js/main.js',
        ];

        parent::init();
    }
}