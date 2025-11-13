<?php

namespace appfoster\upsnap\services;

use appfoster\upsnap\Constants;
use craft\base\Component;
use appfoster\upsnap\records\SettingRecord;
use appfoster\upsnap\Upsnap;
use Craft;
use Exception;
use GuzzleHttp\Client;

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
            $primarySiteUrl = Craft::$app->getSites()->getPrimarySite()?->baseUrl;
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
    public function getApiTokenStatus(): string
    {
        return $this->apiKeyStatus ?? Constants::API_KEY_STATUS['active'];
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

    public function getMonitorDetails(string $monitorId): ?array
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
            Craft::error("RESPONSE" . json_encode($response), __METHOD__);

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

    public function formatOptions(array $constants, ?bool $isMonitoringOptions = false): array
    {
        $options = [];
        foreach ($constants as $value => $label) {
            $options[] = [
                'label' => Craft::t('upsnap', $label),
                'value' => (string)$value,
                'disabled' => $isMonitoringOptions ? ($value === 60) : false,
            ];
        }
        return $options;
    }
}
