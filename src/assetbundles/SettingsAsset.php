<?php
namespace appfoster\upsnap\assetbundles;

class SettingsAsset extends BaseAsset
{
    public function init()
    {
        // Include global assets from parent
        parent::init();

        // Add settings-specific assets
        $this->js[] = 'js/settings.js';
        $this->js[] = 'js/monitors.js';
        $this->js[] = 'js/notificationChannels.js';
        $this->css[] = 'css/addMonitorModal.css';
    }
}