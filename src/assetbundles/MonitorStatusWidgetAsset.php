<?php

namespace appfoster\upsnap\assetbundles;

class MonitorStatusWidgetAsset extends BaseAsset
{
    public function init(): void
    {
        parent::init();

        $this->js[] = 'js/monitorStatusWidget.js';
        $this->css[] = 'css/monitorStatusWidget.css';
    }
}
