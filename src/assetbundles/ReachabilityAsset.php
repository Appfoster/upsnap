<?php
namespace appfoster\upsnap\assetbundles;

use craft\web\AssetBundle;
use appfoster\upsnap\Constants;

class ReachabilityAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = Constants::ASSET_SOURCE_PATH;

        $this->depends = [
            BaseAsset::class,
        ];

        $this->js = [
            'js/reachability.js',
        ];

        parent::init();
    }
}