<?php

namespace appfoster\upsnap\services;

use appfoster\upsnap\Constants;
use craft\base\Component;
use appfoster\upsnap\records\SettingRecord;
use appfoster\upsnap\Upsnap;
use Craft;
use Exception;
use GuzzleHttp\Client;
use craft\helpers\UrlHelper;

/**
 * Settings service for managing plugin settings using Record models
 */
class SettingsService extends Component
{
    public ?string $apiKeyStatus;
    /**
     * Create a new Settings model instance
     */
    public function getNewModel()
    {
        return new \appfoster\upsnap\models\SettingsModel();
    }

    /**
     * Get a setting value by key
     */
    public function getSetting(string $key, $default = null)
    {
        $record = SettingRecord::findByKey($key);
        return $record ? $record->getDecodedValue() : $default;
    }

    /**
     * Set a setting value by key
     */
    public function setSetting(string $key, $value): bool
    {
        $record = SettingRecord::findByKey($key);

        if (!$record) {
            $record = new SettingRecord();
            $record->key = $key;
        }

        $record->setEncodedValue($value);

        return $record->save();
    }

    /**
     * Delete a setting by key
     */
    public function deleteSetting(string $key): bool
    {
        $record = SettingRecord::findByKey($key);
        return $record ? $record->delete() : false;
    }

    /**
     * Get all settings as an associative array
     */
    public function getAllSettings(): array
    {
        $records = SettingRecord::find()->all();
        $settings = [];

        foreach ($records as $record) {
            $settings[$record->key] = $record->getDecodedValue();
        }

        return $settings;
    }

    /**
     * Get the monitoring URL from database
     */
    public function getMonitoringUrl(): ?string
    {
        $url = null;
        if (!$this->getSetting('monitoringUrl')) {
            $primarySiteUrl = $this->getSiteUrl();
            if ($primarySiteUrl) {
                $this->setMonitoringUrl($primarySiteUrl);
                return $primarySiteUrl;
            }
        } else {
            $url = $this->getSetting('monitoringUrl');
        }
        return $url;
    }

    /**
     * Set the monitoring URL in database
     */
    public function setMonitoringUrl(?string $url): bool
    {
        if ($url === null || $url === '') {
            return $this->deleteSetting('monitoringUrl');
        }
        return $this->setSetting('monitoringUrl', $url);
    }

    /**
     * Get monitoring enabled status
     */
    public function getMonitorId(): string | null
    {
        return $this->getSetting('monitorId', null);
    }

    public function setMonitorId(?string $monitorId): bool
    {
        if ($monitorId === null || $monitorId === '') {
            return $this->deleteSetting('monitorId');
        }
        return $this->setSetting('monitorId', $monitorId);
    }

    /**
     * Get monitoring enabled status
     */
    public function getMonitoringEnabled(): bool
    {
        return (bool)$this->getSetting('monitoringEnabled', false);
    }

    /**
     * Set monitoring enabled status
     */
    public function setMonitoringEnabled(bool $enabled): bool
    {
        return $this->setSetting('monitoringEnabled', $enabled);
    }

    /**
     * Get monitoring interval
     */
    public function getMonitoringInterval(): int
    {
        return (int)$this->getSetting('monitoringInterval', 5);
    }

    /**
     * Set monitoring interval
     */
    public function setMonitoringInterval(int $interval): bool
    {
        return $this->setSetting('monitoringInterval', $interval);
    }

    /**
     * Returns the API key set in the plugin settings.
     *
     */
    public function getApiKey(): ?string
    {
        return $this->getSetting('apiKey');
    }


    /**
     * Set the API key in the plugin settings.
     */
    public function setApiKey(?string $apiKey): bool
    {
        if ($apiKey === null || $apiKey === '') {
            return $this->deleteSetting('apiKey');
        }
        return $this->setSetting('apiKey', $apiKey);
    }

    public function verifyApiKey(string $apiKey): bool
    {
        try {
            $response = Upsnap::$plugin->apiService->post(Constants::ENDPOINT_VERIFY_API_KEY, [
                'token' => $apiKey
            ]);
            if (
                is_array($response) &&
                isset($response['status'], $response['data']['valid']) &&
                $response['status'] === 'success'
            ) {
                return (bool) $response['data']['valid'];
            }
            return false;
        } catch (\Exception $e) {
            Craft::error('Error verifying API key: ' . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Masks an API key by leaving a certain number of characters unmasked at each end,
     * and replacing the middle part with a masked character.
     *
     */
    public function maskApiKey(?string $apiKey): string
    {
        if (!$apiKey) {
            return '';
        }

        $keyLength = strlen($apiKey);

        // Determine number of characters to leave unmasked at each end (min 1, max 4)
        $visibleCharsCount = max(1, min(4, floor($keyLength / 4)));

        // Calculate number of characters to mask in the middle
        $maskedCharsCount = max(1, $keyLength - ($visibleCharsCount * 2));

        // Extract visible start and end parts
        $visibleStart = substr($apiKey, 0, $visibleCharsCount);
        $visibleEnd = substr($apiKey, -$visibleCharsCount);

        // Generate masked middle part
        $maskedMiddle = str_repeat(Constants::API_KEY_MASKED_CHAR, $maskedCharsCount);

        return $visibleStart . $maskedMiddle . $visibleEnd;
    }


    /**
     * Determine whether the provided API key represents an update.
     *
     */
    public function isApiKeyUpdated(string $apiKey): bool
    {
        return $this->maskApiKey($this->getApiKey()) != $apiKey;
    }


    public function isCheckEnabled(string $checkType): bool
    {
        return (bool)$this->getSetting($checkType . 'Enabled', false);
    }

    public function getReachabilityTolerance(): int
    {
        return (int)$this->getSetting('reachabilityToleranceMinutes', 5);
    }

    public function getsslDaysBeforeExpiryAlert(): int
    {
        return (int)$this->getSetting('sslDaysBeforeExpiryAlert', 15);
    }

    public function getdomainDaysBeforeExpiryAlert(): int
    {
        return (int)$this->getSetting('domainDaysBeforeExpiryAlert', 15);
    }


    /**
     * Set check enabled status
     */
    public function setCheckEnabled(string $checkType, bool $enabled): bool
    {
        return $this->setSetting($checkType . 'Enabled', $enabled);
    }

    /**
     * Set reachability tolerance
     */
    public function setReachabilityTolerance(int $minutes): bool
    {
        return $this->setSetting('reachabilityToleranceMinutes', $minutes);
    }

    /**
     * Set SSL days before expiry alert
     */
    public function setSslDaysBeforeExpiryAlert(int $days): bool
    {
        return $this->setSetting('sslDaysBeforeExpiryAlert', $days);
    }

    /**
     * Set domain days before expiry alert
     */
    public function setDomainDaysBeforeExpiryAlert(int $days): bool
    {
        return $this->setSetting('domainDaysBeforeExpiryAlert', $days);
    }

    /**
     * Get notification emails
     */
    public function getNotificationEmails(): array
    {
        $emails = $this->getSetting('notificationEmails');
        return is_array($emails) ? $emails : [];
    }

    /**
     * Set notification emails
     */
    public function setNotificationEmails(array $emails): bool
    {
        // Filter out empty emails and validate
        $validEmails = array_filter($emails, function ($email) {
            return filter_var($email, FILTER_VALIDATE_EMAIL);
        });

        if (empty($validEmails)) {
            return $this->deleteSetting('notificationEmails');
        }

        return $this->setSetting('notificationEmails', array_values($validEmails));
    }

    /**
     * Validate API Key with microservice
     */
    public function validateApiKey(): void
    {
        $storedKey = $this->getApiKey();

        if (!$storedKey) {
            return;
        }

        try {
            $result = $this->getValidateApiKeyResponse($storedKey);

            if ($result['status'] === 'error') {
                $this->handleInvalidTokenResponse($result['message']);
                return;
            }

            $isValid = $result['isValid'];
            $tokenStatus = $isValid ? Constants::API_KEY_STATUS['active'] : Constants::API_KEY_STATUS['deleted'];
            $this->setApiTokenStatus($tokenStatus);
        } catch (\Throwable $e) {
            Craft::error("Error validating stored API key: {$e->getMessage()}", __METHOD__);
        }
    }


    public function getValidateApiKeyResponse(string $apiKey): array
    {
        try {
            $response = Upsnap::$plugin->apiService->post(Constants::ENDPOINT_VERIFY_API_KEY, [
                'token' => $apiKey,
            ]);

            if (is_array($response)) {
                if ($response['status'] === 'success') {
                    return [
                        'status' => 'success',
                        'isValid' => (bool) ($response['data']['valid'] ?? false),
                        'message' => 'valid',
                        'subscriptionType' => $response['data']['subscription'] ?? Constants::SUBSCRIPTION_TYPES['trial'],
                    ];
                }

                // Capture explicit error responses like suspended, expired, or not found
                if ($response['status'] === 'error' && isset($response['message'])) {
                    return [
                        'status' => 'error',
                        'isValid' => false,
                        'message' => $response['message'],
                    ];
                }
            }

            return ['status' => 'error', 'valid' => false, 'message' => 'Something went wrong.'];
        } catch (\Exception $e) {
            Craft::error('Error verifying API key: ' . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Handles invalid, expired, or missing API token responses from the Upsnap API.
     *
     * Depending on the API response message, this method will:
     * - Notify the user via Craft session errors.
     * - Delete the stored token only if it was not found (i.e., deleted remotely).
     *
     * @param string $apiMessage The message returned by the Upsnap API response.
     */
    protected function handleInvalidTokenResponse(string $apiMessage): void
    {
        $normalizedMessage = strtolower($apiMessage);
        $apiKeyStatus = null;

        if (str_contains($normalizedMessage, 'suspended')) {
            $apiKeyStatus = Constants::API_KEY_STATUS['suspended'];
        } elseif (str_contains($normalizedMessage, 'account expired') || str_contains($normalizedMessage, 'trial expired')) {
            $apiKeyStatus = Constants::API_KEY_STATUS['account_expired'];
        } elseif (str_contains($normalizedMessage, 'expired')) {
            $apiKeyStatus = Constants::API_KEY_STATUS['expired'];
        } elseif (str_contains($normalizedMessage, 'not found')) {
            $apiKeyStatus = Constants::API_KEY_STATUS['deleted'];
        }

        $this->setApiTokenStatus($apiKeyStatus);
    }

    /**
     * Get current user subscription type (defaults to 'free')
     */
    public function getApiTokenStatus(): string | null
    {
        return $this->apiKeyStatus ?? null;
    }

    /**
     * Set current user plan
     */
    public function setApiTokenStatus(?string $status): void
    {
        $this->apiKeyStatus = $status ?? Constants::API_KEY_STATUS['active'];
    }


    /**
     * Check if a URL is reachable
     */
    public function isUrlReachable(string $url): bool
    {
        $client = new Client(['timeout' => 5, 'verify' => false]);

        try {
            $response = $client->head($url, [
                'http_errors' => false,
            ]);

            $statusCode = $response->getStatusCode();

            return $statusCode >= 200 && $statusCode < 400;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function getUserDetails(): ?array
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['user']['details'];

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch user details.');
                throw new \Exception($errorMsg);
            }

            return $response['data'];
        } catch (\Throwable $e) {
            Craft::error("User details fetch failed: {$e->getMessage()}", __METHOD__);
            return null;
        }
    }

    public function getMonitorDetails(string $monitorId): ?array
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch monitor details.');
                throw new \Exception($errorMsg);
            }

            $data = $response['data'] ?? [];

            if (empty($data)) {
                throw new \Exception(Craft::t('upsnap', 'Empty monitor details received.'));
            }

            // Extract monitor details safely
            $config = $data['monitor']['config'] ?? [];
            $meta = $config['meta'] ?? [];
            $services = $config['services'] ?? [];

            return [
                'name' => $data['name'] ?? '',
                'url' => $meta['url'] ?? '',
                'is_enabled' => $data['monitor']['is_enabled'] ?? false,
                'tags' => $data['tags'] ?? [],

                // Services and intervals
                'broken_links_enabled' => $services['broken_links']['enabled'] ?? false,
                'broken_links_interval' => $services['broken_links']['monitor_interval'] ?? 0,

                'domain_enabled' => $services['domain']['enabled'] ?? false,
                'domain_interval' => $services['domain']['monitor_interval'] ?? 0,
                'domain_notify_days_before_expiry' => $services['domain']['notify_days_before_expiry'] ?? 7,

                'lighthouse_enabled' => $services['lighthouse']['enabled'] ?? false,
                'lighthouse_interval' => $services['lighthouse']['monitor_interval'] ?? 0,
                'lighthouse_strategy' => $services['lighthouse']['strategy'] ?? 'desktop',

                'mixed_content_enabled' => $services['mixed_content']['enabled'] ?? false,
                'mixed_content_interval' => $services['mixed_content']['monitor_interval'] ?? 0,

                'ssl_enabled' => $services['ssl']['enabled'] ?? false,
                'ssl_interval' => $services['ssl']['monitor_interval'] ?? 0,
                'ssl_notify_days_before_expiry' => $services['ssl']['notify_days_before_expiry'] ?? 7,

                'uptime_enabled' => $services['uptime']['enabled'] ?? false,
                'uptime_interval' => $services['uptime']['monitor_interval'] ?? 0,
            ];
        } catch (\Throwable $e) {
            Craft::error("Monitor details fetch failed: {$e->getMessage()}", __METHOD__);
            return null;
        }
    }

    /**
     * Step 1 of 3: Create account and return session token.
     * Session token is stored temporarily for use in subsequent steps.
     */
    public function createUserAccountStep(string $email, string $password, string $fullname): array
    {
        $result = Upsnap::$plugin->apiService->signupUser($email, $password, $fullname);
        if (($result['status'] ?? '') === 'success') {
            $data = $result['data'] ?? [];
            $sessionToken = $data['token'] ?? null;

            if (!$sessionToken) {
                return [
                    'status' => 'error',
                    'message' => 'Account creation failed: No session token received.',
                ];
            }

            // Store session token temporarily in cache for use in step 2
            Craft::$app->getCache()->set('upsnap_signup_session_' . $sessionToken, $email, 3600);

            return [
                'status' => 'success',
                'data' => [
                    'session_token' => $sessionToken,
                    'message' => 'Account created successfully.',
                ],
            ];
        }

        return $result;
    }

    /**
     * Step 2 of 3: Exchange session token for API token.
     * Stores the API token for later use.
     */
    public function getApiTokenStep(string $sessionToken): array
    {
        if (!$sessionToken) {
            return [
                'status' => 'error',
                'message' => 'Invalid session token.',
            ];
        }

        try {
            $apiKey = $this->getOrCreateApiToken($sessionToken);
            if (!$apiKey) {
                return [
                    'status' => 'error',
                    'message' => 'Could not retrieve or create API token.',
                ];
            }

            // Store API key for later retrieval
            $this->setApiKey($apiKey);

            return [
                'status' => 'success',
                'data' => [
                    'api_token' => $this->maskApiKey($apiKey),
                    'message' => 'API key fetched successfully.',
                ],
            ];
        } catch (\Throwable $e) {
            Craft::error("Step 2 failed: {$e->getMessage()}", __METHOD__);
            return [
                'status' => 'error',
                'message' => 'Error fetching API token: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Step 3 of 3: Create first monitor with the API token.
     * Must be called after step 2 (API token must be stored).
     */
    public function createFirstMonitorStep(): array
    {
        try {
            // Create first monitor
            $monitorResult = $this->createFirstMonitor();

            if (!$monitorResult['success']) {
                // Don't fail entirely, monitor creation is optional
                return [
                    'status' => 'success',
                    'data' => [
                        'monitor_id' => null,
                        'message' => 'Account ready. Monitor creation is optional.',
                    ],
                ];
            }

            // Set the created monitor as primary
            $monitorId = $monitorResult['data']['id'] ?? null;
            $monitorUrl = $monitorResult['data']['config']['meta']['url'] ?? null;

            if ($monitorId) {
                $this->setMonitorId($monitorId);
            }
            if ($monitorUrl) {
                $this->setMonitoringUrl($monitorUrl);
            }

            return [
                'status' => 'success',
                'data' => [
                    'monitor_id' => $monitorId,
                    'monitor_url' => $monitorUrl,
                    'message' => 'First monitor created successfully.',
                ],
                'success' => true,
            ];
        } catch (\Throwable $e) {
            Craft::error("Step 3 failed: {$e->getMessage()}", __METHOD__);
            return [
                'status' => 'error',
                'message' => 'Error creating first monitor: ' . $e->getMessage(),
                'success' => false,
            ];
        }
    }

    /**
     * Login an existing UpSnap user, storing the returned token and monitor URL locally.
     *
     * @param string $email
     * @param string $password
     * @return array
     */
    public function login(string $email, string $password): array
    {
        $result = Upsnap::$plugin->apiService->loginUser($email, $password);

        if (($result['status'] ?? '') === 'success') {
            $data = $result['data'] ?? [];

            // Get session token
            $sessionToken = $data['token'] ?? null;
            if (!$sessionToken) {
                return [
                    'status' => 'error',
                    'message' => 'Login failed: No session token received.',
                ];
            }

            // Fetch or create API token
            $apiKey = $this->getOrCreateApiToken($sessionToken);
            if (!$apiKey) {
                return [
                    'status' => 'error',
                    'message' => 'Login failed: Could not retrieve or create API token.',
                ];
            }

            // Store API key
            $this->setApiKey($apiKey);

            // Store monitor URL if provided
            if (!empty($data['monitor_url'])) {
                $this->setMonitoringUrl($data['monitor_url']);
            }
        }

        return $result;
    }

    /**
     * Get existing API token or create new one
     *
     * @param string $sessionToken
     * @return string|null
     */
    private function getOrCreateApiToken(string $sessionToken): ?string
    {
        // Try to get existing tokens
        $tokensResult = Upsnap::$plugin->apiService->getTokens($sessionToken);

        if (($tokensResult['status'] ?? '') === 'success') {
            $tokens = $tokensResult['data']['tokens'] ?? [];
            if (!empty($tokens)) {
                // Use first token
                return $tokens[0]['token_hash'] ?? null;
            }
        }

        // No existing tokens, create new one
        $generateResult = Upsnap::$plugin->apiService->generateToken($sessionToken);

        if (($generateResult['status'] ?? '') === 'success') {
            return $generateResult['data']['token_hash'] ?? null;
        }

        return null;
    }

    /**
     * Create the first monitor for a new user using Craft CMS site details
     */
    private function createFirstMonitor(): array
    {
        $originalToken = Upsnap::$plugin->apiService->getApiToken();
        // Upsnap::$plugin->apiService->setApiToken($sessionToken);

        try {
            // Get Craft CMS site details
            $siteUrl = $this->getSiteUrl();
            $siteName =  'Craft CMS Site';
            if (!$siteUrl) {
                throw new \Exception('Could not determine site URL for monitor creation.');
            }

            // Create monitor payload
            $payload = [
                'name' => $siteName . ' Monitor',
                'service_type' => Constants::SERVICE_TYPES['website'],
                'config' => [
                    'meta' => [
                        'url' => $siteUrl,
                    ],
                ],
                'is_enabled' => true
            ];

            // Create monitor via API
            $result = Upsnap::$plugin->apiService->post(Constants::MICROSERVICE_ENDPOINTS['monitors']['create'], $payload);
            Craft::error("Create monitor API response:" . print_r($result, true), __METHOD__);

            if (($result['status'] ?? '') === 'success') {
                // Extract monitor from nested structure
                $monitor = $result['data']['monitor'] ?? $result['data'] ?? [];
                return [
                    'success' => true,
                    'data' => $monitor,
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Failed to create monitor.',
            ];
        } catch (\Throwable $e) {
            Craft::error("Monitor creation failed: {$e->getMessage()}", __METHOD__);
            return [
                'success' => false,
                'message' => 'An error occurred while creating the monitor.',
            ];
        }
    }

    /**
     * Format an array of constants as an array of options, with optional restrictions
     */
    public function formatOptions(
        array $constants,
        ?bool $applyRestrictions = false,
        ?int $userPlanMonitoringInterval = null
    ): array {
        $options = [];

        foreach ($constants as $value => $label) {
            $disabled = false;

            if ($applyRestrictions === true && $userPlanMonitoringInterval !== null) {
                $disabled = $value < $userPlanMonitoringInterval;
            }

            $options[] = [
                'label' => Craft::t('upsnap', $label),
                'value' => (string) $value,
                'disabled' => $disabled, // always boolean
            ];
        }

        return $options;
    }

    /**
     * Returns a reliable site URL with fallbacks.
     *
     * @return string|null
     */
    public function getSiteUrl(): ?string
    {
        $request = Craft::$app->getRequest();
        //  Web request fallback
        if (!$request->getIsConsoleRequest()) {
            return $request->getHostInfo();
        }


        return parse_url(UrlHelper::siteUrl(), PHP_URL_HOST);
    }
}