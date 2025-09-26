<?php

namespace appfoster\upsnap\controllers;

use Craft;

class BaseController extends \craft\web\Controller
{
    /**
     * @inheritdoc
     */
    public function init(): void
    {
        parent::init();

        // All actions require admin access
        $this->requireAdmin();
    }
}