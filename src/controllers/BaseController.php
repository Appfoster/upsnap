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
     * Redirect to Settings → API Key tab when no API key is stored or when API key is expired.
     * SettingsController (id = 'settings') is excluded to prevent redirect loops.
     *
     * @inheritdoc
     */
    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        $settingsService = Upsnap::getInstance()->settingsService;
        $hasApiKey = $settingsService->getApiKey() !== null;
        if ($hasApiKey) {
            $settingsService->validateApiKey();
        }

        return true;
    }
}