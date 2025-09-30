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
    }
}