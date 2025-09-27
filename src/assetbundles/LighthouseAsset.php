<?php
namespace appfoster\upsnap\assetbundles;

use craft\web\AssetBundle;
use appfoster\upsnap\Constants;

class LighthouseAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = Constants::ASSET_SOURCE_PATH;

        $this->depends = [
            BaseAsset::class,
        ];

        $this->css = [
            'css/lighthouse-scores.css',
        ];

        $this->js = [
            'js/lighthouseScore.js',
        ];

        parent::init();
    }
}
