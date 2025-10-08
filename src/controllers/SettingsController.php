<?php

namespace appfoster\upsnap\controllers;

use Craft;
use appfoster\upsnap\Upsnap;
use appfoster\upsnap\assetbundles\SettingsAsset;

class SettingsController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        SettingsAsset::register($this->view);
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
            'title' => \Craft::t('upsnap', 'Settings'),
            'selectedSubnavItem' => 'settings',
        ];

        return $this->renderTemplate('upsnap/settings/_index', $variables);
    }

    /**
     * Save settings
     */
    public function actionSave()
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

            // Send the settings back to the template with errors
            Craft::$app->getUrlManager()->setRouteParams([
                'settings' => $settings
            ]);

            return null;
        }

        $apiKey = $settings->apiKey;
        $validationSuccess = $service->verifyApiKey($apiKey);
        if (!$validationSuccess) {
            Craft::$app->getSession()->setError(Craft::t('upsnap', 'Invalid API Key.'));
            Craft::$app->getUrlManager()->setRouteParams(['settings' => $settings]);
            return null;
        }

        // Save settings to database
        $service->setMonitoringUrl($settings->monitoringUrl);
        $service->setApiKey($apiKey); // save the API key
        $service->setMonitoringEnabled($settings->enabled);
        $service->setMonitoringInterval($settings->monitoringInterval);
        $service->setNotificationEmail($settings->notificationEmail);

        Craft::$app->getSession()->setNotice(Craft::t('upsnap', 'Settings saved.'));

        return $this->redirectToPostedUrl();
    }
}