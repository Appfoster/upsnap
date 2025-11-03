<?php

namespace appfoster\upsnap\services;

use appfoster\upsnap\Constants;
use craft\base\Component;
use appfoster\upsnap\records\SettingRecord;
use appfoster\upsnap\Upsnap;
use Craft;
use Exception;

/**
 * Settings service for managing plugin settings using Record models
 */
class SettingsService extends Component
{
    public ?string $userSubscriptionType;
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
        if (!$this->getApiKey()) {
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

            // Store subscription type for use in the settings template
            if (isset($result['subscriptionType'])) {
                $this->setUserSubscriptionType($result['subscriptionType']);
            }
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
                        'valid' => (bool) ($response['data']['valid'] ?? false),
                        'message' => 'valid',
                        'subscriptionType' => $response['data']['subscription'] ?? Constants::SUBSCRIPTION_TYPES['trial'],
                    ];
                }

                // Capture explicit error responses like suspended, expired, or not found
                if ($response['status'] === 'error' && isset($response['message'])) {
                    return [
                        'status' => 'error',
                        'valid' => false,
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
        $displayMessage = null;
        $shouldRemoveToken = false;

        if (str_contains($normalizedMessage, 'suspended')) {
            $displayMessage = Craft::t('upsnap', 'Your API token has been suspended. Please add a valid one.');
        } elseif (str_contains($normalizedMessage, 'expired')) {
            $displayMessage = Craft::t('upsnap', 'Your API token has expired. Please add a valid one.');
        } elseif (str_contains($normalizedMessage, 'not found')) {
            $displayMessage = Craft::t('upsnap', 'Your API token was not found (it may have been deleted). Please add a valid one.');
            $shouldRemoveToken = true;
        }

        if ($displayMessage !== null) {
            if ($shouldRemoveToken) {
                $this->setApiKey('');
            }
            Craft::$app->getSession()->setError($displayMessage);
        }
    }

    /**
     * Get current user subscription type (defaults to 'free')
     */
    public function getUserSubscriptionType(): string
    {
        return $this->userSubscriptionType ?? Constants::SUBSCRIPTION_TYPES['trial'];
    }

    /**
     * Set current user plan
     */
    public function setUserSubscriptionType(?string $plan): void
    {
        $this->userSubscriptionType = $plan ?? Constants::SUBSCRIPTION_TYPES['trial'];
    }
}
