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
        $this->js[] = 'js/monitorsTable.js';
        $this->js[] = 'js/notificationChannels.js';
        $this->js[] = 'js/signupInlineProgress.js';
        $this->js[] = 'js/verificationBanner.js';
        $this->css[] = 'css/addMonitorModal.css';
        $this->css[] = 'css/notification-channels.css';
        $this->css[] = 'css/signupInlineProgress.css';
        $this->css[] = 'css/verificationBanner.css';
    }
}