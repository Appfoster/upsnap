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

        /**
         * TODO: this is being added just because some pages are not loading fine without dashboard css and js files.
         * Because of css has been added to wrong file. For global css and js plugin wide create global.css/js and use here
         * and if a css or js is limited to a particular page then use its assets bundle not global.
         */
        $this->css = [
            'css/dashboard.css',
        ];

        $this->js = [
            'js/dashboard.js',
        ];

        parent::init();
    }
}