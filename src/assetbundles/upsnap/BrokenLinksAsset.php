<?php
namespace appfoster\upsnap\assetbundles\upsnap;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class BrokenLinksAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/upsnap/dist";


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
