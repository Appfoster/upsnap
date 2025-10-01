<?php

namespace appfoster\upsnap\services;

use craft\base\Component;
use appfoster\upsnap\records\SettingRecord;

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
}