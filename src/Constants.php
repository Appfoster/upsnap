<?php

namespace appfoster\upsnap;

/**
 * Upsnap Constants
 */
class Constants
{
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
}