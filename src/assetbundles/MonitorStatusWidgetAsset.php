<?php

namespace appfoster\upsnap\assetbundles;

class MonitorStatusWidgetAsset extends BaseAsset
{
    public function init()
    {
        parent::init();

        $this->js[] = 'js/monitorStatusWidget.js';
        $this->css[] = 'css/monitorStatusWidget.css';
    }
}
