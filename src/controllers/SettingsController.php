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

        $settings->reachabilityEnabled = $service->isCheckEnabled(Constants::CHECK_REACHABILITY);
        $settings->securityCertificatesEnabled = $service->isCheckEnabled(Constants::CHECK_SECURITY_CERTIFICATES);
        $settings->brokenLinksEnabled = $service->isCheckEnabled(Constants::CHECK_BROKEN_LINKS);
        $settings->lighthouseEnabled = $service->isCheckEnabled(Constants::CHECK_LIGHTHOUSE);
        $settings->domainEnabled = $service->isCheckEnabled(Constants::CHECK_DOMAIN);
        $settings->mixedContentEnabled = $service->isCheckEnabled(Constants::CHECK_MIXED_CONTENT);

        $settings->reachabilityToleranceMinutes = $service->getReachabilityTolerance();
        $settings->sslDaysBeforeExpiryAlert = $service->getSslDaysBeforeExpiryAlert();
        $settings->domainDaysBeforeExpiryAlert = $service->getDomainDaysBeforeExpiryAlert();


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
        $settings->reachabilityEnabled = (bool)$request->getBodyParam('reachabilityEnabled', false);
        $settings->reachabilityToleranceMinutes = (int)$request->getBodyParam('reachabilityToleranceMinutes', 5);
        $settings->brokenLinksEnabled = (bool)$request->getBodyParam('brokenLinksEnabled', false);
        $settings->securityCertificatesEnabled = (bool)$request->getBodyParam('securityCertificatesEnabled', false);
        $settings->sslDaysBeforeExpiryAlert = (int)$request->getBodyParam('sslDaysBeforeExpiryAlert', 30);
        $settings->domainEnabled = (bool)$request->getBodyParam('domainEnabled', false);
        $settings->domainDaysBeforeExpiryAlert = (int)$request->getBodyParam('domainDaysBeforeExpiryAlert', 30);
        $settings->mixedContentEnabled = (bool)$request->getBodyParam('mixedContentEnabled', false);
        $settings->lighthouseEnabled = (bool)$request->getBodyParam('lighthouseEnabled', false);


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


        // Save healthcheck settings to database
        $service->setCheckEnabled(Constants::CHECK_REACHABILITY, $settings->reachabilityEnabled ?? false);
        $service->setReachabilityTolerance($settings->reachabilityToleranceMinutes );
        $service->setCheckEnabled(Constants::CHECK_BROKEN_LINKS, $settings->brokenLinksEnabled ?? false);
        $service->setCheckEnabled(Constants::CHECK_SECURITY_CERTIFICATES, $settings->securityCertificatesEnabled ?? false);
        $service->setSslDaysBeforeExpiryAlert($settings->sslDaysBeforeExpiryAlert);
        $service->setCheckEnabled(Constants::CHECK_DOMAIN, $settings->domainEnabled ?? false);
        $service->setDomainDaysBeforeExpiryAlert($settings->domainDaysBeforeExpiryAlert);
        $service->setCheckEnabled(Constants::CHECK_MIXED_CONTENT, $settings->mixedContentEnabled ?? false);
        $service->setCheckEnabled(Constants::CHECK_LIGHTHOUSE, $settings->lighthouseEnabled ?? false);

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
