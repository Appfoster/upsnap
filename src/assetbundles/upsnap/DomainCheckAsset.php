<?php
namespace appfoster\upsnap\assetbundles\upsnap;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class DomainCheckAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/upsnap/dist";

        $this->depends = [
            CommonAsset::class,
        ];

        $this->css = [
            'css/domain-check.css',
        ];

        $this->js = [
            'js/domainCheck.js',
        ];

        parent::init();
    }
}