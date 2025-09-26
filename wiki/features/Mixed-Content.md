# Mixed Content

Detect and monitor mixed content issues that compromise HTTPS security.

## Overview

Identify HTTP resources loaded on HTTPS pages that can compromise site security and user trust.

## Features

### Content Scanning
- **Passive Mixed Content**: Images, stylesheets, fonts
- **Active Mixed Content**: Scripts, XMLHttpRequest, WebSockets
- **Iframe Content**: Embedded iframe security
- **Form Submissions**: HTTP form action URLs

### Security Assessment
- **Risk Classification**: High, medium, low risk categorization
- **Impact Analysis**: Security and functionality impact
- **Upgrade Recommendations**: HTTPS migration suggestions
- **Compliance Monitoring**: Security standard compliance

### Monitoring & Alerts
- **Real-time Detection**: Live mixed content identification
- **Historical Tracking**: Mixed content trend analysis
- **Alert Configuration**: Customizable alert thresholds
- **Resolution Tracking**: Fix progress monitoring

## Configuration

### Mixed Content Settings

```php
'mixed_content' => [
    'check_interval' => 3600,     // Check every hour
    'scan_depth' => 'full',       // 'full' or 'surface'
    'risk_levels' => [            // Alert risk levels
        'high',
        'medium'
    ],
    'exclude_patterns' => [       // URL patterns to exclude
        '/legacy/*',
        '/third-party/*'
    ],
    'auto_fix' => false           // Automatic HTTPS conversion
]
```

### Content Types Monitored

- **Images**: HTTP images on HTTPS pages
- **Stylesheets**: HTTP CSS files
- **Scripts**: HTTP JavaScript files
- **Fonts**: HTTP web fonts
- **Media**: HTTP video/audio files
- **Ajax Requests**: HTTP API calls
- **Form Actions**: HTTP form submissions

## Usage

### Mixed Content Dashboard

1. Navigate to **Site Monitor → Mixed Content**
2. View mixed content violations by risk level
3. Review affected pages and resources
4. Track resolution progress

### Risk Classification

#### High Risk
- **Active Mixed Content**: Scripts, XMLHttpRequest
- **Form Submissions**: HTTP form actions
- **Authentication**: HTTP login forms

#### Medium Risk
- **Passive Content**: Images, CSS, fonts
- **Media Files**: Video and audio content
- **Third-party Widgets**: External embedded content

#### Low Risk
- **Legacy Content**: Old HTTP-only resources
- **Development Assets**: Local development resources
- **Intentionally HTTP**: Explicitly allowed HTTP content

## API Integration

### Mixed Content Endpoints

```php
// Get mixed content report
GET /api/v1/mixed-content/report

// Scan specific page
POST /api/v1/mixed-content/scan
{
  "url": "https://example.com/page",
  "depth": "full"
}

// Get resolution status
GET /api/v1/mixed-content/status
```

## Content Analysis

### Detection Methods

#### HTML Parsing
- **Tag Attributes**: src, href, action attributes
- **Inline Styles**: HTTP URLs in CSS
- **JavaScript URLs**: HTTP URLs in scripts
- **Meta Tags**: HTTP URLs in meta tags

#### Network Monitoring
- **HTTP Requests**: All HTTP requests on HTTPS pages
- **Redirect Chains**: HTTP to HTTPS redirect detection
- **CORS Requests**: Cross-origin resource sharing
- **WebSocket Connections**: Insecure WebSocket connections

### Risk Assessment

```php
'risk_assessment' => [
    'active_content' => 'high',     // Scripts, XHR
    'passive_content' => 'medium',  // Images, CSS
    'form_actions' => 'high',       // Form submissions
    'third_party' => 'medium'       // External resources
]
```

## HTTPS Migration

### Content Upgrades

#### Automatic Fixes
- **Protocol Relative URLs**: //example.com/image.jpg
- **HTTPS Conversion**: HTTP to HTTPS URL conversion
- **CDN Updates**: Content delivery network HTTPS
- **Resource Updates**: Asset URL modifications

#### Manual Interventions
- **Code Updates**: Hardcoded HTTP URL fixes
- **Configuration Changes**: Server configuration updates
- **Third-party Updates**: External service HTTPS migration
- **Content Migration**: Legacy content HTTPS conversion

### Migration Strategies

```php
'migration' => [
    'protocol_relative' => true,    // Convert to // URLs
    'force_https' => true,          // Force HTTPS loading
    'cdn_upgrade' => true,          // CDN HTTPS migration
    'third_party_check' => true     // External service checks
]
```

## Reporting

### Mixed Content Reports

```json
{
  "total_violations": 25,
  "high_risk": 5,
  "medium_risk": 15,
  "low_risk": 5,
  "affected_pages": 12,
  "resolution_rate": 0.6,
  "categories": {
    "images": 10,
    "scripts": 8,
    "stylesheets": 4,
    "other": 3
  }
}
```

### Export Formats
- **CSV Reports**: Spreadsheet analysis
- **JSON API**: Programmatic access
- **HTML Dashboard**: Visual reports
- **Security Audit**: Compliance reports

## Troubleshooting

### Common Issues

#### Content Loading Problems
- **Blocked Resources**: Browser blocking mixed content
- **Broken Functionality**: Scripts failing to load
- **Visual Issues**: Images or styles not loading
- **Security Warnings**: Browser security indicators

#### Migration Challenges
- **Hardcoded URLs**: Code requiring manual updates
- **Third-party Services**: External services not supporting HTTPS
- **Legacy Systems**: Old systems without HTTPS support
- **CDN Configuration**: Content delivery network issues

### Resolution Steps

```php
'resolution' => [
    'auto_fix_enabled' => true,
    'manual_review_required' => true,
    'third_party_contact' => true,
    'testing_environment' => 'staging'
]
```

## Best Practices

### HTTPS Implementation
- **SSL Certificates**: Valid certificate installation
- **HSTS Headers**: HTTP Strict Transport Security
- **Redirects**: HTTP to HTTPS redirects
- **Certificate Chains**: Complete certificate chains

### Content Security
- **Content Security Policy**: CSP header implementation
- **Subresource Integrity**: SRI for external resources
- **HTTPS Only**: Disable HTTP access
- **Monitoring**: Continuous mixed content monitoring

## Integration

### Security Tools Integration
```php
'security_integration' => [
    'ssl_labs' => true,           // SSL Labs integration
    'security_headers' => true,   // Security header checks
    'csp_monitoring' => true,     // CSP violation monitoring
    'hsts_preload' => true        // HSTS preload submission
]
```

### CMS Integration
- **Content Updates**: Automatic content HTTPS conversion
- **Asset Management**: Media library HTTPS enforcement
- **Link Checking**: Internal link HTTPS validation
- **Plugin Integration**: Third-party plugin compatibility

## API Reference

### Mixed Content Violation Object

```json
{
  "id": "violation_12345",
  "url": "https://example.com/page",
  "resource_url": "http://example.com/image.jpg",
  "resource_type": "image",
  "risk_level": "medium",
  "detection_method": "html_parsing",
  "context": "img src attribute",
  "discovered_at": "2024-01-15T10:30:00Z",
  "status": "open"
}
```

## Support

- [Mixed Content Mozilla Docs](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [HTTPS Migration Guide](https://web.dev/why-https-matters/)
- [Troubleshooting Guide](../Troubleshooting.md)