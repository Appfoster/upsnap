<?php
namespace appfoster\sitemonitor\assetbundles\monitor;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class SecurityCertificates extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/sitemonitor/assetbundles/monitor/dist";


        $this->depends = [
            CpAsset::class,
        ];

        $this->css = [
            'css/security-certificates.css',
        ];

        parent::init();
    }
}
