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
        $monitorId = $service->getMonitorId();


        // Create a settings model with current database values
        $settings = $service->getNewModel();
        $monitoringUrl = $service->getMonitoringUrl();
        if (!$monitoringUrl) {
            // For fresh setup, use the primary site's base URL as default
            $primarySite = Craft::$app->getSites()->getPrimarySite();
            $monitoringUrl = rtrim($primarySite->getBaseUrl(), '/');
        }
        $settings->monitoringUrl = $monitoringUrl;
        $settings->monitorId = $monitorId;
        $apiKey = $service->getApiKey();
        $settings->apiKey = $service->maskApiKey($apiKey);
        $settings->monitoringInterval = $service->getMonitoringInterval();
        

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

        // Set default monitoring URL if not set
        if (!$settings->monitoringUrl) {
            $primarySite = Craft::$app->getSites()->getPrimarySite();
            $settings->monitoringUrl = rtrim($primarySite->getBaseUrl(), '/');
        }

        // Only update fields that are actually in the request
        $this->updateIfExists($settings, $body, 'apiKey', 'trim');

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


        Craft::$app->getSession()->setNotice(Craft::t('upsnap', 'Settings saved.'));
        return $this->redirectToPostedUrl();
    }

    /**
     * Render the settings page with validation errors.
     */
    private function renderSettings($settings): \yii\web\Response
    {
        $service = Upsnap::getInstance()->settingsService;
        $service->validateApiKey();
        $userDetails = null;
        if($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }
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
                'userDetails' => $userDetails,
                'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS, true),
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


    public function actionSetPrimaryMonitor(): \yii\web\Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $plugin = Upsnap::getInstance();
        $service = $plugin->settingsService;

        $monitorId = $request->getBodyParam('monitorId');
        $monitoringUrl = $request->getBodyParam('monitoringUrl');

        if (!$monitorId || !$monitoringUrl) {
            return $this->asJson([
                'success' => false,
                'message' => 'Missing monitorId or monitoringUrl.'
            ]);
        }

        try {
            // Save values
            $service->setMonitorId($monitorId);
            $service->setMonitoringUrl($monitoringUrl);

            return $this->asJson([
                'success' => true,
                'message' => 'Primary monitor updated.',
                'data' => [
                    'monitorId' => $monitorId,
                    'monitoringUrl' => $monitoringUrl,
                ]
            ]);

        } catch (\Throwable $e) {
            return $this->asJson([
                'success' => false,
                'message' => 'Error saving monitor: ' . $e->getMessage()
            ]);
        }
    }

}
