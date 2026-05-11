<?php

namespace appfoster\upsnap\controllers;

use Craft;
use appfoster\upsnap\Upsnap;
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

    /**
     * @inheritdoc
     *
     * For AJAX requests, release the PHP session write lock as soon as authentication
     * is confirmed (in init()). PHP file-based sessions serialize concurrent requests
     * from the same browser — without this, the 10+ parallel dashboard AJAX calls queue
     * up behind each other instead of running in parallel, which causes the 1–1.5 min
     * load times when a slow health-check (Lighthouse, Broken Links) holds the lock.
     * Session data is already loaded into memory at this point; closing the lock does
     * not affect auth or CSRF for the remainder of this request.
     */
    public function beforeAction($action): bool
    {
        $result = parent::beforeAction($action);

        if ($result && Craft::$app->getRequest()->getIsAjax()) {
            Craft::$app->getSession()->close();
        }

        return $result;
    }
}