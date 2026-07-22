<?php

namespace appfoster\upsnap\assetbundles;

use CraftCms\Cms\View\HtmlStack;

class MultisiteSetupAsset extends BaseAsset
{
    public function register(HtmlStack $htmlStack): void
    {
        parent::register($htmlStack);

        $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/multisiteSetup.js'));
    }
}
