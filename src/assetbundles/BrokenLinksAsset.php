<?php
namespace appfoster\upsnap\assetbundles;

use craft\web\AssetBundle;
use appfoster\upsnap\Constants;

class BrokenLinksAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = Constants::ASSET_SOURCE_PATH;

        $this->depends = [
            BaseAsset::class,
        ];

        $this->css = [
            'css/broken-links.css',
        ];

        $this->js = [
            'js/brokenLinks.js',
        ];

        parent::init();
    }
}
