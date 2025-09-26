<?php
namespace appfoster\upsnap\assetbundles\upsnap;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class ReachabilityAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/upsnap/dist";

        $this->depends = [
            CommonAsset::class,
        ];

        $this->css = [
            'css/reachability.css',
        ];

        $this->js = [
            'js/reachability.js',
        ];

        parent::init();
    }
}