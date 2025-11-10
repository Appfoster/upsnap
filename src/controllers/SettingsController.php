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
        $service->validateApiKey(); // Validate API key on loading settings page

        $monitorData = null;
        $monitorId = $service->getMonitorId();
        if ($monitorId) {
            $monitorData = $service->getMonitorDetails($monitorId);
        }


        // Create a settings model with current database values
        $settings = $service->getNewModel();
        $settings->monitoringUrl = $service->getMonitoringUrl();
        $settings->monitorId = $monitorId;
        $apiKey = $service->getApiKey();

        $settings->apiKey = $service->maskApiKey($apiKey);
        $settings->monitoringInterval = $service->getMonitoringInterval();

        $settings->notificationEmails = $service->getNotificationEmails();

        $settings->enabled = $monitorData['is_enabled'] ?? true;
        $settings->reachabilityEnabled = $monitorData['uptime_enabled'] ?? true;
        $settings->reachabilityMonitoringInterval = $monitorData['uptime_interval'] ?? 3600;

        $settings->securityCertificatesEnabled = $monitorData['ssl_enabled'] ?? true;
        $settings->securityCertificatesMonitoringInterval = $monitorData['ssl_interval'] ?? 86400;
        $settings->sslDaysBeforeExpiryAlert = $monitorData['ssl_notify_days_before_expiry'] ?? 7;

        $settings->brokenLinksEnabled = $monitorData['broken_links_enabled'] ?? true;
        $settings->brokenLinksMonitoringInterval = $monitorData['broken_links_interval']  ?? 3700;

        $settings->domainEnabled = $monitorData['domain_enabled'] ?? true;
        $settings->domainMonitoringInterval = $monitorData['domain_interval'] ?? 86400;
        $settings->domainDaysBeforeExpiryAlert = $monitorData['domain_notify_days_before_expiry']  ?? 7;

        $settings->lighthouseEnabled = $monitorData['lighthouse_enabled'] ?? true;
        $settings->lighthouseMonitoringInterval = $monitorData['lighthouse_interval'] ?? 86400;
        $settings->lighthouseStrategy = $monitorData['lighthouse_strategy'] ?? Constants::LIGHTHOUSE_STRATEGIES['desktop'];

        $settings->mixedContentEnabled = $monitorData['mixed_content_enabled'] ?? true;
        $settings->mixedContentMonitoringInterval = $monitorData['mixed_content_interval'] ?? 3600;



        return $this->renderSettings($settings);
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

        $body = $request->getBodyParams();

        $settings = $service->getNewModel();

        // Only update fields that are actually in the request
        $this->updateIfExists($settings, $body, 'monitoringUrl');
        $this->updateIfExists($settings, $body, 'monitorId');
        $this->updateIfExists($settings, $body, 'apiKey', 'trim');
        $this->updateIfExists($settings, $body, 'notificationEmails', 'json');

        // Validate only updated fields
        if (!$settings->validate()) {
            $allErrors = collect($settings->getErrors())->flatten()->join("\n");
            Craft::$app->getSession()->setError($allErrors);
            return $this->renderSettings($settings);
        }

        // API key handling if updated
        if (array_key_exists('apiKey', $body) && $service->isApiKeyUpdated($settings->apiKey)) {
            try {
                if (!$service->verifyApiKey($settings->apiKey)) {
                    Craft::$app->getSession()->setError(Craft::t('upsnap', 'Invalid API Key.'));
                    return $this->renderSettings($settings);
                }
                $service->setApiKey($settings->apiKey);
            } catch (\Throwable $e) {
                Craft::$app->getSession()->setError('Error verifying API key: ' . $e->getMessage());
                return $this->renderSettings($settings);
            }
        }

        // Save only what was updated
        if (array_key_exists('monitoringUrl', $body)) {
            $service->setMonitoringUrl($settings->monitoringUrl);
        }

        if (array_key_exists('monitorId', $body)) {
            $service->setMonitorId($settings->monitorId);
        }

        if (array_key_exists('notificationEmails', $body)) {
            $service->setNotificationEmails($settings->notificationEmails);
        }

        Craft::$app->getSession()->setNotice(Craft::t('upsnap', 'Settings saved.'));
        return $this->redirectToPostedUrl();
    }

    /**
     * Render the settings page with validation errors.
     */
    private function renderSettings($settings): \yii\web\Response
    {
        $service = Upsnap::getInstance()->settingsService;
        return $this->healthCheckService->sendResponse(
            [
                'settings' => $settings,
                'showHealthchecks' => $service->getApiKey() !== null,
                'upsnapDashboardUrl' => Constants::UPSNAP_DASHBOARD_URL,
                'title' => Constants::SUBNAV_ITEM_SETTINGS['label'],
                'selectedSubnavItem' => Constants::SUBNAV_ITEM_SETTINGS['key'],
                'apiTokenStatus' => $service->getApiTokenStatus(),
                'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
                'apiTokenStatuses' => Constants::API_KEY_STATUS,
                'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS),
                'strategyOptions' => $service->formatOptions(Constants::LIGHTHOUSE_STRATEGIES),
                'expiryDayOptions' => $service->formatOptions(Constants::EXPIRY_DAYS),
            ],
            Constants::SUBNAV_ITEM_SETTINGS['template']
        );
    }

    /**
     * Updates a setting value if the key exists in the body.
     *
     * This function is used to update a setting value if it exists in the body.
     * It will also cast the value to the specified type
     */
    private function updateIfExists($settings, array $body, string $key, ?string $type = null): void
    {
        if (!array_key_exists($key, $body)) {
            return;
        }

        $value = $body[$key];

        switch ($type) {
            case 'bool':
                $value = (bool)$value;
                break;
            case 'int':
                $value = (int)$value;
                break;
            case 'float':
                $value = (float)$value;
                break;
            case 'trim':
                $value = trim((string)$value);
                break;
            case 'json':
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    $value = $decoded ?? $value;
                }
        }

        $settings->$key = $value;
    }
}
