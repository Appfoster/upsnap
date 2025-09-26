# Configuration

This guide covers all configuration options available in the Site Monitor plugin.

## Environment Variables

Configure these variables in your `.env` file for optimal plugin operation.

### Required Variables

```env
# Site Monitor API Configuration
SITE_MONITOR_API_URL=https://eagle-eye.appfoster.site
SITE_MONITOR_API_TOKEN=your-api-token-here

# Primary site to monitor
SITE_MONITOR_URL=https://your-site.com
```

### Optional Variables

```env
# API timeout (seconds)
SITE_MONITOR_API_TIMEOUT=120

# Debug mode
SITE_MONITOR_DEBUG=false
```

## Plugin Settings

Access plugin settings through the Craft Control Panel at **Settings → Plugins → Site Monitor**.

### General Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Enabled** | Boolean | `true` | Enable/disable all monitoring |
| **Monitoring Interval** | Integer | `5` | Check frequency in minutes |
| **Notification Email** | String | `null` | Email for alerts |

### Monitoring URLs

Configure additional URLs to monitor:

- Add multiple URLs for comprehensive monitoring
- Supports HTTP and HTTPS protocols
- Each URL is monitored independently

### Advanced Settings

#### API Configuration
- **API Base URL**: Override the default API endpoint
- **API Version**: Specify API version to use
- **Timeout**: Request timeout in seconds

#### Notification Settings
- **Email Alerts**: Enable/disable email notifications
- **Alert Thresholds**: Configure when to trigger alerts
- **Alert Recipients**: Multiple email addresses

## API Configuration

### Authentication

The plugin uses Bearer token authentication with the external monitoring service:

```bash
Authorization: Bearer your-api-token-here
```

### Endpoints

The plugin communicates with these API endpoints:

- `POST /v1/healthcheck` - Run monitoring checks
- `GET /v1/history` - Retrieve historical data
- `GET /v1/status` - Service status information

### Rate Limiting

- Default: 100 requests per hour
- Configurable per API plan
- Automatic retry with exponential backoff

## Monitoring Configuration

### Check Types

Configure which monitoring checks to enable:

- **Reachability**: Site availability and response times
- **Security Certificates**: SSL/TLS validation
- **Broken Links**: Link integrity scanning
- **Lighthouse**: Performance metrics
- **Domain Check**: DNS and domain health
- **Mixed Content**: HTTPS security

### Check Intervals

Set different intervals for different check types:

```php
// Example configuration
'reachability' => 5,    // Every 5 minutes
'security' => 60,      // Every hour
'lighthouse' => 1440,  // Daily
```

### Geographic Monitoring

Configure monitoring locations:

- **Default**: Global monitoring network
- **Custom**: Specific geographic regions
- **CDN**: Content delivery network monitoring

## Security Configuration

### API Security

- Store API tokens securely in environment variables
- Never commit tokens to version control
- Rotate tokens regularly
- Use HTTPS for all API communications

### Access Control

Configure user permissions:

- **Admin Access**: Full plugin access
- **View Only**: Read-only monitoring data
- **No Access**: Plugin hidden from navigation

## Performance Tuning

### Caching

Configure caching for better performance:

- **Result Caching**: Cache monitoring results
- **API Response Caching**: Cache API responses
- **Cache TTL**: Time-to-live for cached data

### Database Optimization

- **Result Retention**: Configure data retention periods
- **Database Cleanup**: Automatic old data removal
- **Indexing**: Optimize database queries

## Advanced Configuration

### Custom Checks

Add custom monitoring checks:

```php
// config/site-monitor.php
return [
    'customChecks' => [
        'custom-check' => [
            'enabled' => true,
            'interval' => 10,
            'handler' => 'app\\custom\\CustomCheckHandler',
        ],
    ],
];
```

### Webhooks

Configure webhook notifications:

```php
'webhooks' => [
    'slack' => 'https://hooks.slack.com/...',
    'discord' => 'https://discord.com/api/webhooks/...',
],
```

## Configuration Validation

The plugin validates all configuration on save:

- **Environment Variables**: Checked for presence and format
- **URLs**: Validated for proper format
- **Email Addresses**: Verified format
- **Intervals**: Must be positive integers

## Troubleshooting Configuration

### Common Issues

**Environment Variables Not Loading**
- Check `.env` file permissions
- Verify variable names match exactly
- Restart web server after changes

**API Connection Failed**
- Verify API URL and token
- Check network connectivity
- Review firewall settings

**Settings Not Saving**
- Check user permissions
- Verify form validation errors
- Clear Craft cache

## Configuration Examples

### Basic Setup

```env
SITE_MONITOR_API_URL=https://eagle-eye.appfoster.site
SITE_MONITOR_API_TOKEN=your-token-here
SITE_MONITOR_URL=https://your-site.com
```

### Advanced Setup

```env
# API Configuration
SITE_MONITOR_API_URL=https://api.custom-monitor.com
SITE_MONITOR_API_TOKEN=secure-token-123
SITE_MONITOR_API_TIMEOUT=60

# Monitoring
SITE_MONITOR_URL=https://your-site.com
SITE_MONITOR_DEBUG=true

# Notifications
SITE_MONITOR_ALERT_EMAIL=admin@your-site.com
SITE_MONITOR_SLACK_WEBHOOK=https://hooks.slack.com/...
```

## Next Steps

After configuration:
- [Start using the plugin](Usage.md)
- [Learn about features](features/Reachability-Monitoring.md)
- [Set up alerts](features/Alert-System.md)