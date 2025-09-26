<?php
namespace appfoster\upsnap\assetbundles\upsnap;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class LighthouseAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/upsnap/dist";


        $this->depends = [
            CommonAsset::class,
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
