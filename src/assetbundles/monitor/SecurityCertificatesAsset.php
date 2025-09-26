<?php
namespace appfoster\upsnap\assetbundles\monitor;

use craft\web\AssetBundle;

class SecurityCertificatesAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/upsnap/assetbundles/monitor/dist";


        $this->depends = [
            CommonAsset::class,
        ];

        $this->css = [
            'css/security-certificates.css',
        ];

        parent::init();
    }
}
