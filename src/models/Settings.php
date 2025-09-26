<?php

namespace appfoster\upsnap\models;

use craft\base\Model;

/**
 * Site Monitor Settings Model
 */
class Settings extends Model
{
    /**
     * @var bool Whether the monitoring is enabled
     */
    public bool $enabled = true;

    /**
     * @var int Monitoring interval in minutes
     */
    public int $monitoringInterval = 5;

    /**
     * @var string|null Notification email for alerts
     */
    public ?string $notificationEmail = null;

    /**
     * @var array URLs to monitor
     */
    public array $monitoringUrls = [];

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            ['enabled', 'boolean'],
            ['monitoringInterval', 'integer', 'min' => 1],
            ['notificationEmail', 'email'],
            ['monitoringInterval', 'required'],
            ['monitoringUrls', 'each', 'rule' => ['url']],
        ];
    }
}