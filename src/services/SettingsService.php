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
        return $this->getSetting('monitoringUrl');
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
     * Get notification email
     */
    public function getNotificationEmail(): ?string
    {
        return $this->getSetting('notificationEmail');
    }

    /**
     * Set notification email
     */
    public function setNotificationEmail(?string $email): bool
    {
        if ($email === null || $email === '') {
            return $this->deleteSetting('notificationEmail');
        }
        return $this->setSetting('notificationEmail', $email);
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
        return true;
        try {
            $response = Upsnap::$plugin->apiService->post(Constants::ENDPOINT_VERIFY_API_KEY, [
                'token' => $apiKey
            ]);
        } catch (\Exception $e) {
            Craft::error('Error verifying API key: ' . $e->getMessage(), __METHOD__);
            throw $e;
        }
        return $response['success'] ?? false;
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
    $validEmails = array_filter($emails, function($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL);
    });
    
    if (empty($validEmails)) {
        return $this->deleteSetting('notificationEmails');
    }
    
    return $this->setSetting('notificationEmails', array_values($validEmails));
}
}
