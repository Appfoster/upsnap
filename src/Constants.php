<?php

namespace appfoster\upsnap;

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
    public const API_BASE_URL = 'https://eagle-eye.appfoster.site';
    public const API_VERSION = 'v1';
    public const API_AUTH_TOKEN = 'test-token';

    // API Endpoints
    public const ENDPOINT_HEALTHCHECK = 'healthcheck';

    // Check Types
    public const CHECK_REACHABILITY = 'reachability';
    public const CHECK_SECURITY_CERTIFICATES = 'security_certificates';
    public const CHECK_BROKEN_LINKS = 'broken_links';
    public const CHECK_LIGHTHOUSE = 'lighthouse';
    public const CHECK_DOMAIN = 'domain_check';
    public const CHECK_MIXED_CONTENT = 'mixed_content';

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
    const SUBNAV_ITEM_SETTINGS = [
        'label' => 'Settings',
        'key' => 'settings',
        'url' => 'upsnap/settings',
        'template' => 'upsnap/healthcheck/settings'
    ];

    const SUBNAV_ITEM_LIST = [
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
        self::SUBNAV_ITEM_SETTINGS['key'] => [
            'label' => self::SUBNAV_ITEM_SETTINGS['label'],
            'url' => self::SUBNAV_ITEM_SETTINGS['url']
        ],
    ];

    const BROKEN_LINKS_TYPE = [
        'internal' => 'internal',
        'external' => 'external',
    ];
}