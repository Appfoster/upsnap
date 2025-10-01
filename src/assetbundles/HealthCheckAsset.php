<?php
namespace appfoster\upsnap\assetbundles;

class HealthCheckAsset extends BaseAsset
{
    public function init()
    {
        // Include global assets from parent
        parent::init();

        // Add health check-specific assets
        $this->css[] = 'css/health-check.css';
        $this->js[] = 'js/health-check.js';
    }
}
