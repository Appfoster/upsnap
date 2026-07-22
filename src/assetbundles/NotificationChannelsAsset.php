<?php

namespace appfoster\upsnap\assetbundles;

class NotificationChannelsAsset extends BaseAsset
{
    public function init(): void
    {
        // Include global assets from parent
        parent::init();

        $this->js = [
            'js/notificationChannels.js',
        ];
        $this->css = [
            'css/notification-channels.css',
            'css/addMonitorModal.css',
        ];
    }
}
