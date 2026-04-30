<?php

namespace appfoster\upsnap\assetbundles;

class IncidentDetailAsset extends BaseAsset
{
    public function init()
    {
        parent::init();

        $this->js[]  = 'js/incident-detail.js';
        $this->css[] = 'css/incident-detail.css';
    }
}
