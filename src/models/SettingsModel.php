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
     * @var array|null Notification email for alerts
     */
    public ?array $notificationEmails = null;

    /**
     * @var string|null URL to monitor
     */
    public ?string $monitoringUrl = null;
    
    public ?string $apiKey = null;
    public bool $reachabilityEnabled = false;
    public bool $securityCertificatesEnabled = false;
    public bool $brokenLinksEnabled = false;
    public bool $lighthouseEnabled = false;
    public bool $domainEnabled = false;
    public bool $mixedContentEnabled = false;
    public int $reachabilityToleranceMinutes = 5;
    public int $sslDaysBeforeExpiryAlert = 15;
    public int $domainDaysBeforeExpiryAlert = 15;

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            ['enabled', 'boolean'],
            ['monitoringInterval', 'integer', 'min' => 1],
            ['monitoringUrl', 'required'],
            ['monitoringInterval', 'required', 'when' => function($model) {
                return $model->enabled === true;
            }],
            ['apiKey', 'string',]
        ];
    }
}