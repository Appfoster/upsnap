<?php
namespace appfoster\sitemonitor\assetbundles\monitor;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class BrokenLinksAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/sitemonitor/assetbundles/monitor/dist";


        $this->depends = [
            CommonAsset::class,
        ];

        $this->css = [
            'css/broken-links.css',
        ];

        $this->js = [
            'js/brokenLinks.js',
        ];

        parent::init();
    }
}
