<?php
 
namespace appfoster\upsnap\assetbundles;
 
class NavBadgeAsset extends BaseAsset
{
    public function init(): void
    {
        $this->css = [
            'css/global.css',
        ];
 
        $this->js = [
            'js/nav-badge.js',
        ];
    }
}
