<?php

namespace appfoster\upsnap\controllers;

use Craft;
use craft\helpers\UrlHelper;
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
        $service->validateApiKey();
        $apiTokenStatus = $service->getApiTokenStatus();
        if (!$monitoringUrl) {
            // For fresh setup, use the primary site's base URL as default
            $primarySite = Craft::$app->getSites()->getPrimarySite();
            $monitoringUrl = rtrim($primarySite->getBaseUrl(), '/');
        }
        if($apiTokenStatus != Constants::API_KEY_STATUS['active']) {
            $settings->monitoringUrl = $monitoringUrl;
        }
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
        if ($service->getApiKey()) {
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

        if (!$monitorId) {
            return $this->asJson([
                'success' => false,
                'message' => 'Missing monitorId.'
            ]);
        }

        try {
            // Always save the monitor ID
            $service->setMonitorId($monitorId);

            // Only save the monitoring URL if it's provided (website monitors only)
            if ($monitoringUrl) {
                $service->setMonitoringUrl($monitoringUrl);
            }

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

    /**
     * Handle in-plugin user signup (AJAX POST).
     * Returns JSON with success/error details and a redirectUrl on success.
     */
    public function actionSignup(): \yii\web\Response
    {
        $this->requirePostRequest();

        $request  = Craft::$app->getRequest();
        $email    = trim($request->getBodyParam('email', ''));
        $password = $request->getBodyParam('password', '');

        $errors = [];

        if ($email === '') {
            $errors['email'] = [Craft::t('upsnap', 'Email is required.')];
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = [Craft::t('upsnap', 'Please enter a valid email address.')];
        }

        if ($password === '') {
            $errors['password'] = [Craft::t('upsnap', 'Password is required.')];
        } elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password)) {
            $errors['password'] = [Craft::t('upsnap', 'Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.')];
        }

        if (!empty($errors)) {
            return $this->asJson(['success' => false, 'errors' => $errors]);
        }

        try {
            //TODO: Replace mock response with real API call once the endpoint is ready
            $result = Upsnap::getInstance()->settingsService->signup($email, $password);

            if (($result['status'] ?? '') === 'success') {
                return $this->asJson([
                    'success'     => true,
                    'message'     => $result['data']['message'] ?? Craft::t('upsnap', 'Account created successfully! Monitoring has started.'),
                    'redirectUrl' => UrlHelper::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']),
                ]);
            }

            return $this->asJson([
                'success' => false,
                'errors'  => ['general' => [$result['message'] ?? Craft::t('upsnap', 'Account creation failed. Please try again.')]],
            ]);
        } catch (\Throwable $e) {
            Craft::error('Signup failed: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'success' => false,
                'errors'  => ['general' => [Craft::t('upsnap', 'An error occurred. Please try again.')]],
            ]);
        }
    }
}
