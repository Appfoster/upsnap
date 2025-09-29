<?php
namespace appfoster\upsnap\assetbundles;

class HealthCheckAsset extends BaseAsset
{
    public function init()
    {
        $this->css = [
            'css/health-check.css',
        ];

        $this->js = [
            'js/health-check.js',
        ];

        parent::init();
    }
}
