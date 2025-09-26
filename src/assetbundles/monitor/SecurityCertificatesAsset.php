<?php
namespace appfoster\sitemonitor\assetbundles\monitor;

use craft\web\AssetBundle;

class SecurityCertificatesAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/sitemonitor/assetbundles/monitor/dist";


        $this->depends = [
            CommonAsset::class,
        ];

        $this->css = [
            'css/security-certificates.css',
        ];

        parent::init();
    }
}
