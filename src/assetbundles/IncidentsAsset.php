<?php

namespace appfoster\upsnap\assetbundles;

class IncidentsAsset extends BaseAsset
{
    public function init(): void
    {
        parent::init();

        $this->js[]  = 'js/incidents.js';
        $this->css[] = 'css/incidents.css';
    }
}
