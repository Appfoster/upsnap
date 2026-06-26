<?php

namespace appfoster\upsnap\assetbundles;

class MultisiteSetupAsset extends BaseAsset
{
    public function init()
    {
        parent::init();

        $this->js[] = 'js/multisiteSetup.js';
    }
}
