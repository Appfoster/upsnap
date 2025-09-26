<?php
/**
 * Translations for Craft plugin for Craft CMS 3.x
 *
 * Translations for Craft eliminates error prone and costly copy/paste workflows for launching human translated Craft CMS web content.
 *
 * @link      http://www.acclaro.com/
 * @copyright Copyright (c) 2018 Acclaro
 */

namespace appfoster\sitemonitor\assetbundles\monitor;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class BrokenLinksAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = "@appfoster/sitemonitor/assetbundles/monitor/dist";


        $this->depends = [
            CpAsset::class,
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
