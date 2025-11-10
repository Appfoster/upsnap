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
        $apiKey = $service->getApiKey();
        
        $settings->apiKey = $service->maskApiKey($apiKey);
        $settings->monitoringInterval = $service->getMonitoringInterval();
        
        $settings->notificationEmails = $service->getNotificationEmails();
        
        $settings->enabled = $monitorData['is_enabled'];
        $settings->reachabilityEnabled = $monitorData['uptime_enabled'];
        $settings->reachabilityMonitoringInterval = $monitorData['uptime_interval'];

        $settings->securityCertificatesEnabled = $monitorData['ssl_enabled'];
        $settings->securityCertificatesMonitoringInterval = $monitorData['ssl_interval'];
        $settings->sslDaysBeforeExpiryAlert = $monitorData['ssl_notify_days_before_expiry'];

        $settings->brokenLinksEnabled = $monitorData['broken_links_enabled'];
        $settings->brokenLinksMonitoringInterval = $monitorData['broken_links_interval'];

        $settings->domainEnabled = $monitorData['domain_enabled'];
        $settings->domainMonitoringInterval = $monitorData['domain_interval'];
        $settings->domainDaysBeforeExpiryAlert = $monitorData['domain_notify_days_before_expiry'];

        $settings->lighthouseEnabled = $monitorData['lighthouse_enabled'];
        $settings->lighthouseMonitoringInterval = $monitorData['lighthouse_interval'];
        $settings->lighthouseStrategy = $monitorData['lighthouse_strategy'];

        $settings->mixedContentEnabled = $monitorData['mixed_content_enabled'];
        $settings->mixedContentMonitoringInterval = $monitorData['mixed_content_interval'];



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
        // $this->updateIfExists($settings, $body, 'enabled', 'bool');
        $this->updateIfExists($settings, $body, 'monitoringInterval', 'int');
        $this->updateIfExists($settings, $body, 'apiKey', 'trim');
        $this->updateIfExists($settings, $body, 'notificationEmails', 'json');

        // $this->updateIfExists($settings, $body, 'reachabilityEnabled', 'bool');
        // $this->updateIfExists($settings, $body, 'reachabilityToleranceMinutes', 'int');
        // $this->updateIfExists($settings, $body, 'brokenLinksEnabled', 'bool');
        // $this->updateIfExists($settings, $body, 'securityCertificatesEnabled', 'bool');
        // $this->updateIfExists($settings, $body, 'sslDaysBeforeExpiryAlert', 'int');
        // $this->updateIfExists($settings, $body, 'domainEnabled', 'bool');
        // $this->updateIfExists($settings, $body, 'domainDaysBeforeExpiryAlert', 'int');
        // $this->updateIfExists($settings, $body, 'mixedContentEnabled', 'bool');
        // $this->updateIfExists($settings, $body, 'lighthouseEnabled', 'bool');

        // Validate only updated fields
        if (!$settings->validate()) {
            $allErrors = collect($settings->getErrors())->flatten()->join("\n");
            Craft::$app->getSession()->setError($allErrors);
            return $this->renderSettings($settings);
        }

        // Check monitoring URL reachability before saving
        if (array_key_exists('monitoringUrl', $body) && !empty($settings->monitoringUrl)) {
            if (!$service->isUrlReachable($settings->monitoringUrl)) {
                Craft::$app->getSession()->setError(
                    Craft::t('upsnap', 'The monitoring URL could not be reached. Please check the URL and try again.')
                );
                return $this->renderSettings($settings);
            }
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

        if (array_key_exists('enabled', $body)) {
            $service->setMonitoringEnabled($settings->enabled);
        }

        if (array_key_exists('monitoringInterval', $body)) {
            $service->setMonitoringInterval($settings->monitoringInterval);
        }

        if (array_key_exists('notificationEmails', $body)) {
            $service->setNotificationEmails($settings->notificationEmails);
        }

        if (array_key_exists('reachabilityEnabled', $body)) {
            $service->setCheckEnabled(Constants::CHECK_REACHABILITY, $settings->reachabilityEnabled ?? false);
        }
        if (array_key_exists('reachabilityToleranceMinutes', $body)) {
            $service->setReachabilityTolerance($settings->reachabilityToleranceMinutes);
        }
        if (array_key_exists('brokenLinksEnabled', $body)) {
            $service->setCheckEnabled(Constants::CHECK_BROKEN_LINKS, $settings->brokenLinksEnabled ?? false);
        }
        if (array_key_exists('securityCertificatesEnabled', $body)) {
            $service->setCheckEnabled(Constants::CHECK_SECURITY_CERTIFICATES, $settings->securityCertificatesEnabled ?? false);
        }
        if (array_key_exists('sslDaysBeforeExpiryAlert', $body)) {
            $service->setSslDaysBeforeExpiryAlert($settings->sslDaysBeforeExpiryAlert);
        }
        if (array_key_exists('domainEnabled', $body)) {
            $service->setCheckEnabled(Constants::CHECK_DOMAIN, $settings->domainEnabled ?? false);
        }
        if (array_key_exists('domainDaysBeforeExpiryAlert', $body)) {
            $service->setDomainDaysBeforeExpiryAlert($settings->domainDaysBeforeExpiryAlert);
        }
        if (array_key_exists('mixedContentEnabled', $body)) {
            $service->setCheckEnabled(Constants::CHECK_MIXED_CONTENT, $settings->mixedContentEnabled ?? false);
        }
        if (array_key_exists('lighthouseEnabled', $body)) {
            $service->setCheckEnabled(Constants::CHECK_LIGHTHOUSE, $settings->lighthouseEnabled ?? false);
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
