<?php

namespace appfoster\upsnap;
use craft\helpers\App;

/**
 * Upsnap Constants
 */
class Constants
{
    public const PLUGIN_SCHEMA_VERSION = '1.0.0';

    // Plugin Table Names
    public const TABLE_SETTINGS = '{{%upsnap_settings}}';

    // Asset bundle path
    public const ASSET_SOURCE_PATH = '@upsnap/assetbundles/dist';

    // API Configuration
    public const API_BASE_URL_DEFAULT = 'https://api.upsnap.ai';
    public const UPSNAP_DASHBOARD_URL = 'https://upsnap.ai';
    public const API_VERSION = 'v1';
    // API Endpoints
    public const ENDPOINT_HEALTHCHECK = 'healthcheck';

    public const ENDPOINT_VERIFY_API_KEY = 'tokens/validate';

    // Check Types
    public const CHECK_REACHABILITY = 'reachability';
    public const CHECK_SECURITY_CERTIFICATES = 'security_certificates';
    public const CHECK_BROKEN_LINKS = 'broken_links';
    public const CHECK_LIGHTHOUSE = 'lighthouse';
    public const CHECK_DOMAIN = 'domain_check';
    public const CHECK_MIXED_CONTENT = 'mixed_content';
    public const API_KEY_MASKED_CHAR = 'X';

    // HTTP Status Codes
    public const HTTP_OK = 200;
    public const HTTP_CREATED = 201;
    public const HTTP_BAD_REQUEST = 400;
    public const HTTP_UNAUTHORIZED = 401;
    public const HTTP_FORBIDDEN = 403;
    public const HTTP_NOT_FOUND = 404;
    public const HTTP_INTERNAL_SERVER_ERROR = 500;

    // Timeout settings
    public const API_TIMEOUT = 120.0;

    // Default monitoring interval (minutes)
    public const DEFAULT_MONITORING_INTERVAL = 5;

    const SUBNAV_ITEM_REACHABILITY = [
        'label' => 'Reachability',
        'key' => 'reachability',
        'url' => 'upsnap/reachability',
        'template' => 'upsnap/healthcheck/reachability',
        'apiLabel' => 'uptime'
    ];
    const SUBNAV_ITEM_SECURITY_CERTIFICATES = [
        'label' => 'Security Certificates',
        'key' => 'security-certificates',
        'url' => 'upsnap/security-certificates',
        'template' => 'upsnap/healthcheck/security-certificates',
        'apiLabel' => 'ssl'
    ];
    const SUBNAV_ITEM_BROKEN_LINKS = [
        'label' => 'Broken Links',
        'key' => 'broken-links',
        'url' => 'upsnap/broken-links',
        'template' => 'upsnap/healthcheck/broken-links',
        'apiLabel' => 'broken_links'
    ];
    const SUBNAV_ITEM_LIGHTHOUSE = [
        'label' => 'Lighthouse',
        'key' => 'lighthouse',
        'url' => 'upsnap/lighthouse',
        'template' => 'upsnap/healthcheck/lighthouse',
        'apiLabel' => 'lighthouse'
    ];
    const SUBNAV_ITEM_DOMAIN_CHECK = [
        'label' => 'Domain Check',
        'key' => 'domain-check',
        'url' => 'upsnap/domain-check',
        'template' => 'upsnap/healthcheck/domain-check',
        'apiLabel' => 'domain'
    ];
    const SUBNAV_ITEM_MIXED_CONTENT = [
        'label' => 'Mixed Content',
        'key' => 'mixed-content',
        'url' => 'upsnap/mixed-content',
        'template' => 'upsnap/healthcheck/mixed-content',
        'apiLabel' => 'mixed_content'
    ];
    const SUBNAV_ITEM_STATUS_PAGE = [
        'label' => 'Status Pages',
        'key' => 'status-pages',
        'url' => 'upsnap/status-page',
        'template' => 'upsnap/status-page/_index'
    ];
    const SUBNAV_ITEM_SETTINGS = [
        'label' => 'Settings',
        'key' => 'settings',
        'url' => 'upsnap/settings',
        'template' => 'upsnap/settings/_index'
    ];

    const SUBNAV_ITEM_DASHBOARD = [
        'label' => 'Dashboard',
        'key' => 'dashboard',
        'url' => 'upsnap',
        'template' => 'upsnap/_index'
    ];


    const SUBNAV_ITEM_LIST = [
        self::SUBNAV_ITEM_DASHBOARD['key'] => [
            'label' => self::SUBNAV_ITEM_DASHBOARD['label'],
            'url' => self::SUBNAV_ITEM_DASHBOARD['url']
        ],
        self::SUBNAV_ITEM_REACHABILITY['key'] => [
            'label' => self::SUBNAV_ITEM_REACHABILITY['label'],
            'url' => self::SUBNAV_ITEM_REACHABILITY['url']
        ],
        self::SUBNAV_ITEM_SECURITY_CERTIFICATES['key'] => [
            'label' => self::SUBNAV_ITEM_SECURITY_CERTIFICATES['label'],
            'url' => self::SUBNAV_ITEM_SECURITY_CERTIFICATES['url']
        ],
        self::SUBNAV_ITEM_BROKEN_LINKS['key'] => [
            'label' => self::SUBNAV_ITEM_BROKEN_LINKS['label'],
            'url' => self::SUBNAV_ITEM_BROKEN_LINKS['url']
        ],
        self::SUBNAV_ITEM_LIGHTHOUSE['key'] => [
            'label' => self::SUBNAV_ITEM_LIGHTHOUSE['label'],
            'url' => self::SUBNAV_ITEM_LIGHTHOUSE['url']
        ],
        self::SUBNAV_ITEM_DOMAIN_CHECK['key'] => [
            'label' => self::SUBNAV_ITEM_DOMAIN_CHECK['label'],
            'url' => self::SUBNAV_ITEM_DOMAIN_CHECK['url']
        ],
        self::SUBNAV_ITEM_MIXED_CONTENT['key'] => [
            'label' => self::SUBNAV_ITEM_MIXED_CONTENT['label'],
            'url' => self::SUBNAV_ITEM_MIXED_CONTENT['url']
        ],
        self::SUBNAV_ITEM_STATUS_PAGE['key'] => [
            'label' => self::SUBNAV_ITEM_STATUS_PAGE['label'],
            'url' => self::SUBNAV_ITEM_STATUS_PAGE['url']
        ],
        self::SUBNAV_ITEM_SETTINGS['key'] => [
            'label' => self::SUBNAV_ITEM_SETTINGS['label'],
            'url' => self::SUBNAV_ITEM_SETTINGS['url']
        ],
    ];

    const BROKEN_LINKS_TYPE = [
        'internal' => 'internal',
        'external' => 'external',
    ];

    const SUBSCRIPTION_TYPES = [
        'trial' => 'trial',
        'pro' => 'pro',
        'enterprise' => 'enterprise',
    ];

    const API_KEY_STATUS = [
        'active' => 'active',
        'suspended' => 'suspended',
        'expired' => 'expired',
        'deleted' => 'deleted',
    ];

    // Microservice endpoints
    public const MICROSERVICE_ENDPOINTS = [
        'monitors' => [
            'create' => 'user/monitors',
            'list' => 'user/monitors',
            'view' => 'user/monitors',
            'delete' => 'user/monitors',
            'update' => 'user/monitors',
            'bulk_actions' => 'user/monitors',
            'integrations' => [
                'list' => 'user/integrations',
                'create' => 'user/integrations',
                'delete' => 'user/integrations/',
                'supported' => 'integrations/supported',
            ],
            'notification_channels' => [
                'list' => 'user/integrations',
                'create' => 'user/integrations',
                'update' => 'user/integrations',
            ],
            'histogram' => 'user/monitors/{monitorId}/histogram',
            'response_time' => 'user/monitors/{monitorId}/response-time',
            'uptime_stats' => 'user/monitors/{monitorId}/uptime-stats',
            'status-page' => [
                'list' => 'user/status-pages',
                'detail' => 'user/status-pages',
                'create' => 'user/status-pages',
                'update' => 'user/status-pages',
                'delete' => 'user/status-pages',
            ]
        ],
        'user' => [
            'details' => 'user/details'
        ],
        'regions' => [
            'list' => 'regions'
        ],
    ];

    public const LIGHTHOUSE_STRATEGY = [
        'mobile' => 'mobile',
        'desktop' => 'desktop',
    ];

    // Monitor intervals (seconds → label)
    public const MONITOR_INTERVALS = [
        60 => '1 minute',
        300 => '5 minutes',
        900 => '15 minutes',
        3600 => '1 hour',
        21600 => '6 hours',
        86400 => '1 day',
        604800 => '1 week',
    ];


    // Lighthouse strategies
    public const LIGHTHOUSE_STRATEGIES = [
        'mobile' => 'Mobile',
        'desktop' => 'Desktop',
    ];

    // SSL / Domain expiry days
    public const EXPIRY_DAYS = [
        1 => '1 day',
        7 => '7 days',
        15 => '15 days',
        30 => '1 month',
        90 => '3 months',
    ];

    public const SERVICE_TYPES = [
        'website' => 'website',
        'port' => 'port',
        'keyword' => 'keyword',
    ];

    public static function getAPIBaseUrl(): string
    {
        return App::env('UPSNAP_API_BASE_URL') ?? self::API_BASE_URL_DEFAULT;
    }
}