<?php
namespace appfoster\upsnap\assetbundles;

use craft\web\AssetBundle;
use appfoster\upsnap\Constants;
use craft\web\assets\cp\CpAsset;

class BaseAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = Constants::ASSET_SOURCE_PATH;

        $this->depends = [
            CpAsset::class,
        ];

        $this->css = [];

        $this->js = [];

        parent::init();
    }
}