<?php
namespace appfoster\sitemonitor\assetbundles\monitor;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class LighthouseAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/sitemonitor/assetbundles/monitor/dist";


        $this->depends = [
            CpAsset::class,
        ];

        $this->css = [
            'css/lighthouse-scores.css',
        ];

        $this->js = [
            'js/lighthouseScore.js',
        ];

        parent::init();
    }
}
