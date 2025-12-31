<?php

namespace appfoster\upsnap\assetbundles;

class StatusPageAsset extends BaseAsset
{
    public function init()
    {
        // Include global assets from parent
        parent::init();

        $this->js = [
            'js/status-pages.js',
        ];
        $this->css = [
            'css/status-page.css'
        ];
    }
}
