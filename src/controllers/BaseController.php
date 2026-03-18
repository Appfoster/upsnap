<?php

namespace appfoster\upsnap\controllers;

use Craft;
use craft\helpers\UrlHelper;
use appfoster\upsnap\assetbundles\BaseAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;

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
        $apiTokenStatus = $settingsService->getApiTokenStatus();

        if ($this->id !== 'settings' && (!$hasApiKey || $apiTokenStatus === Constants::API_KEY_STATUS['expired'] || $apiTokenStatus === Constants::API_KEY_STATUS['account_expired'])) {
            $tab = $hasApiKey ? '#api-tab' : '#register-signin-tab';
            $settingsUrl = UrlHelper::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']) . $tab;

            if (Craft::$app->getRequest()->getIsAjax()) {
                Craft::$app->getResponse()->format = \yii\web\Response::FORMAT_JSON;
                Craft::$app->getResponse()->data   = ['success' => false, 'redirectUrl' => $settingsUrl];
                Craft::$app->getResponse()->send();
                Craft::$app->end();
            }

            Craft::$app->getResponse()->redirect($settingsUrl)->send();
            Craft::$app->end();
        }

        return true;
    }
}