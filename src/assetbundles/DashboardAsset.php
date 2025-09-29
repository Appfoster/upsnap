<?php
namespace appfoster\upsnap\assetbundles;

class DashboardAsset extends BaseAsset
{
    public function init()
    {
        $this->css = [
            'css/dashboard.css',
        ];

        $this->js = [
            'js/dashboard.js',
        ];

        parent::init();
    }
}