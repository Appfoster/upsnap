<?php
namespace appfoster\upsnap\assetbundles;

class DashboardAsset extends BaseAsset
{
    public function init()
    {
        // Include global assets from parent
        parent::init();

        // Add dashboard-specific assets
        $this->css[] = 'css/dashboard.css';
        $this->js[] = 'js/dashboard.js';
    }
}