<?php

namespace appfoster\upsnap\models;

use craft\base\Model;

/**
 * Upsnap Settings Model
 */
class SettingsModel extends Model
{
    /**
     * @var bool Whether the monitoring is enabled
     */
    public bool $enabled = false;

    /**
     * @var int Monitoring interval in minutes
     */
    public int $monitoringInterval = 5;

    /**
     * @var string|null Notification email for alerts
     */
    public ?string $notificationEmail = null;

    /**
     * @var string|null URL to monitor
     */
    public ?string $monitoringUrl = null;

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            ['enabled', 'boolean'],
            ['monitoringInterval', 'integer', 'min' => 1],
            ['notificationEmail', 'email'],
            ['monitoringUrl', 'required'],
            ['monitoringUrl', 'match', 'pattern' => '/^https:\/\/[^\s\/$.?#].[^\s]*$/i', 'message' => 'Monitoring URL must be a valid HTTPS URL.'],
            ['monitoringInterval', 'required', 'when' => function($model) {
                return $model->enabled === true;
            }],
        ];
    }
}