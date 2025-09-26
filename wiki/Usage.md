# Usage Guide

Learn how to use the Site Monitor plugin to monitor your Craft CMS site's health and performance.

## Getting Started

### Accessing the Plugin

1. Log into your Craft Control Panel
2. Look for **Site Monitor** in the main navigation menu
3. Click to access the monitoring dashboard

### Navigation Overview

The plugin provides several monitoring sections:

- **Reachability**: Monitor site uptime and response times
- **Security Certificates**: Check SSL/TLS certificates
- **Broken Links**: Scan for broken links
- **Lighthouse**: View performance scores
- **Domain Check**: Monitor domain health
- **Mixed Content**: Detect HTTPS issues

## Basic Usage

### Running Checks

1. Navigate to any monitoring section
2. Click the **Refresh** button to run a new check
3. Wait for the check to complete
4. Review the results and status indicators

### Understanding Status Indicators

The plugin uses color-coded status indicators:

- 🟢 **Green/Success**: Everything is working correctly
- 🟡 **Yellow/Warning**: Minor issues detected
- 🔴 **Red/Error**: Critical issues requiring attention

### Refreshing Data

- **Manual Refresh**: Click the refresh button in each section
- **Auto-refresh**: Configure automatic checking intervals
- **Bulk Refresh**: Use the main dashboard for multiple checks

## Reachability Monitoring

### Overview

Monitor your site's availability and response times from multiple locations.

### Features

- Real-time uptime monitoring
- Response time tracking
- HTTP status code monitoring
- Geographic monitoring locations
- Historical data and trends

### Using Reachability

1. Go to **Site Monitor → Reachability**
2. View current status and response time
3. Check monitoring location information
4. Review historical uptime data

### Understanding Results

- **Response Time**: How long the site takes to respond
- **HTTP Status**: The HTTP response code
- **Uptime Percentage**: Site availability over time
- **Monitoring Locations**: Geographic check points

## Security Certificates

### Overview

Monitor SSL/TLS certificate validity and security.

### Features

- Certificate expiry monitoring
- Certificate chain validation
- Domain coverage analysis
- Security protocol detection

### Using Security Certificates

1. Navigate to **Site Monitor → Security Certificates**
2. Review certificate details
3. Check expiry dates
4. Monitor certificate chain

### Certificate Information

- **Issuer**: Certificate authority information
- **Valid From/To**: Certificate validity period
- **Serial Number**: Unique certificate identifier
- **Signature Algorithm**: Encryption method used

## Broken Links Detection

### Overview

Scan your site for broken internal and external links.

### Features

- Comprehensive link scanning
- Internal/external link analysis
- Status code reporting
- Link context and anchor text

### Using Broken Links

1. Go to **Site Monitor → Broken Links**
2. Click **Refresh** to start scanning
3. Wait for the scan to complete
4. Review broken links table

### Filtering Results

- **By Type**: Internal vs external links
- **By Status**: Filter by HTTP status codes
- **By Page**: Links found on specific pages

## Lighthouse Performance

### Overview

View Google Lighthouse performance metrics and scores.

### Features

- Performance, Accessibility, Best Practices, SEO scores
- Mobile and desktop analysis
- Core Web Vitals metrics
- Performance recommendations

### Using Lighthouse

1. Navigate to **Site Monitor → Lighthouse**
2. Select device type (Desktop/Mobile)
3. Click **Refresh** to run analysis
4. Review performance scores and metrics

### Understanding Scores

- **Performance**: Loading speed and optimization
- **Accessibility**: Site accessibility compliance
- **Best Practices**: Modern web standards
- **SEO**: Search engine optimization

## Domain Health Check

### Overview

Monitor domain registration and DNS configuration.

### Features

- Domain expiry monitoring
- DNS record validation
- WHOIS information
- Domain status codes

### Using Domain Check

1. Go to **Site Monitor → Domain Check**
2. Review domain registration details
3. Check DNS configuration
4. Monitor expiry dates

### Domain Information

- **Registration Date**: When domain was registered
- **Expiry Date**: When domain expires
- **Nameservers**: DNS server information
- **Status Codes**: Domain status indicators

## Mixed Content Detection

### Overview

Detect HTTP resources loaded on HTTPS pages.

### Features

- Automatic mixed content scanning
- Security vulnerability identification
- Content type analysis
- Resource location reporting

### Using Mixed Content

1. Navigate to **Site Monitor → Mixed Content**
2. Click **Refresh** to scan for issues
3. Review any mixed content warnings
4. Fix identified resources

### Mixed Content Types

- **Images**: HTTP images on HTTPS pages
- **Scripts**: HTTP JavaScript files
- **Stylesheets**: HTTP CSS files
- **Other Resources**: Fonts, media files, etc.

## Advanced Features

### Historical Data

Access historical monitoring data:

1. Go to **Reachability → History**
2. Filter by date range and status
3. Export data if needed
4. Analyze trends over time

### Alert Configuration

Set up monitoring alerts:

1. Configure notification email
2. Set alert thresholds
3. Choose alert conditions
4. Test alert system

### API Integration

Use the plugin's API for custom integrations:

```php
// Example: Get monitoring data
$data = SiteMonitor::$plugin->apiService->post('healthcheck', [
    'url' => 'https://your-site.com',
    'checks' => ['reachability', 'broken_links']
]);
```

## Best Practices

### Monitoring Frequency

- **Critical Sites**: Check every 5 minutes
- **Important Sites**: Check every 15-30 minutes
- **Standard Sites**: Check hourly or daily

### Alert Thresholds

- **Response Time**: Alert if > 3 seconds
- **Uptime**: Alert if < 99.9%
- **SSL Expiry**: Alert 30 days before expiry

### Regular Maintenance

- Review monitoring results weekly
- Update SSL certificates proactively
- Fix broken links promptly
- Monitor performance trends

## Troubleshooting

### Common Issues

**Checks Not Running**
- Verify API configuration
- Check network connectivity
- Review error logs

**Inaccurate Results**
- Clear plugin cache
- Verify target URLs
- Check firewall settings

**Slow Performance**
- Adjust monitoring intervals
- Enable caching
- Optimize database queries

## Support Resources

- [Troubleshooting Guide](Troubleshooting.md)
- [API Documentation](api/API-Reference.md)
- [FAQ](FAQ.md)
- [GitHub Issues](https://github.com/Appfoster/site-monitor/issues)