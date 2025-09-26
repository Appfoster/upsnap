<?php
namespace appfoster\upsnap\assetbundles\monitor;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class MixedContentAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/monitor/dist";

        $this->depends = [
            CommonAsset::class,
        ];

        $this->css = [
            'css/mixed-content.css',
        ];

        $this->js = [
            'js/mixedContent.js',
        ];

        parent::init();
    }
}