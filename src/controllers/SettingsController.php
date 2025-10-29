<?php

namespace appfoster\upsnap\controllers;

use Craft;
use appfoster\upsnap\Upsnap;
use appfoster\upsnap\assetbundles\SettingsAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;

class SettingsController extends BaseController
{
    private HealthCheckService $healthCheckService;

    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        SettingsAsset::register($this->view);
        $this->healthCheckService = new HealthCheckService($this);
    }

    /**
     * Show settings page
     */
    public function actionIndex(): \yii\web\Response
    {
        $plugin = Upsnap::getInstance();
        $service = $plugin->settingsService;

        // Create a settings model with current database values
        $settings = $service->getNewModel();
        $settings->monitoringUrl = $service->getMonitoringUrl();
        $settings->enabled = $service->getMonitoringEnabled();
        $apiKey = $service->getApiKey();

        $settings->apiKey = $service->maskApiKey($apiKey);
        $settings->monitoringInterval = $service->getMonitoringInterval();
        $settings->notificationEmail = $service->getNotificationEmail();

        $variables = [
            'settings' => $settings,
            'title' => Craft::t('upsnap', 'Settings'),
            'selectedSubnavItem' => 'settings',
        ];

        $this->renderSettings($settings);
    }

    /**
     * Save settings
     */
    public function actionSave(): \yii\web\Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $plugin = Upsnap::getInstance();
        $service = $plugin->settingsService;

        // Create settings model and populate with form data
        $settings = $service->getNewModel();
        $settings->monitoringUrl = $request->getBodyParam('monitoringUrl');
        $settings->enabled = (bool)$request->getBodyParam('enabled', false);
        $settings->monitoringInterval = (int)$request->getBodyParam('monitoringInterval');
        $settings->notificationEmail = $request->getBodyParam('notificationEmail');

        $settings->apiKey = trim($request->getBodyParam('apikey'));

        // Validate the settings
        if (!$settings->validate()) {
            Craft::$app->getSession()->setError($settings->getErrors());
            return $this->renderSettings($settings);
        }

        if ($service->isApiKeyUpdated($settings->apiKey)) {
            try {
                $validationSuccess = $service->verifyApiKey($settings->apiKey);
            } catch (\Throwable $e) {
                Craft::$app->getSession()->setError('Error verifying API key: ' . $e->getMessage());
                return $this->renderSettings($settings);
            }

            if (!$validationSuccess) {
                Craft::$app->getSession()->setError(Craft::t('upsnap', 'Invalid API Key.'));
                return $this->renderSettings($settings);
            }

            $service->setApiKey($settings->apiKey); // save the API key
        }

        // Save settings to database
        $service->setMonitoringUrl($settings->monitoringUrl);
        $service->setMonitoringEnabled($settings->enabled);
        $service->setMonitoringInterval($settings->monitoringInterval);
        $service->setNotificationEmail($settings->notificationEmail);

        Craft::$app->getSession()->setNotice(Craft::t('upsnap', 'Settings saved.'));

        return $this->redirectToPostedUrl();
    }

    /**
     * Render the settings page with validation errors.
     */
    private function renderSettings($settings): \yii\web\Response
    {
        return $this->healthCheckService->sendResponse(
            [
                'settings' => $settings,
                'title' => Constants::SUBNAV_ITEM_SETTINGS['label'],
                'selectedSubnavItem' => Constants::SUBNAV_ITEM_SETTINGS['key']
            ],
            Constants::SUBNAV_ITEM_SETTINGS['template']
        );
    }
}
