<?php

namespace appfoster\upsnap\controllers;

use Craft;
use appfoster\upsnap\assetbundles\BaseAsset;

class BaseController extends \craft\web\Controller
{
    /**
     * @inheritdoc
     */
    public function init(): void
    {
        parent::init();
        BaseAsset::register($this->view);

        // All actions require admin access
        $this->requireAdmin();
    }
}