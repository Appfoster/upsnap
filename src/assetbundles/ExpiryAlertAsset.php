<?php
 
namespace appfoster\upsnap\assetbundles;
 
class ExpiryAlertAsset extends BaseAsset
{
    public function init(): void
    {
        $this->css = [
            'css/expiryAlert.css',
        ];
 
        $this->js = [
            'js/expiryAlert.js',
        ];
    }
}
