# Reachability Monitoring

Monitor your site's availability, response times, and uptime from multiple geographic locations.

## Overview

The Reachability monitoring feature provides comprehensive uptime monitoring for your Craft CMS site, ensuring you know immediately when your site goes down or experiences performance issues.

## Features

### Real-time Monitoring
- **Continuous Checks**: Monitor your site 24/7
- **Multiple Locations**: Test from global monitoring points
- **Response Time Tracking**: Measure loading performance
- **HTTP Status Monitoring**: Track response codes

### Geographic Coverage
- **Global Network**: Monitoring from 10+ countries
- **Regional Testing**: Test from locations near your users
- **CDN Validation**: Verify CDN performance
- **Latency Measurement**: Measure response times by region

### Historical Data
- **Uptime History**: 90-day historical data
- **Trend Analysis**: Performance trends over time
- **Downtime Tracking**: Detailed outage information
- **Reporting**: Generate uptime reports

## Configuration

### Basic Setup

1. Configure your site URL in plugin settings
2. Set monitoring interval (default: 5 minutes)
3. Choose monitoring locations
4. Configure alert thresholds

### Advanced Settings

#### Monitoring Intervals
```php
'interval' => 5,        // Check every 5 minutes
'locations' => ['us-east', 'eu-west', 'asia-pacific'],
'alert_threshold' => 300, // Alert after 5 minutes downtime
```

#### Custom Locations
- Select specific geographic regions
- Configure custom monitoring endpoints
- Set up internal network monitoring

## Usage

### Control Panel Access

1. Navigate to **Site Monitor → Reachability**
2. View current status and response times
3. Check monitoring location results
4. Review historical uptime data

### Status Indicators

- **🟢 Online**: Site responding normally
- **🟡 Warning**: Slow response times
- **🔴 Offline**: Site not responding
- **⚪ Maintenance**: Scheduled maintenance mode

### Response Time Metrics

- **Average Response Time**: Rolling average over 24 hours
- **95th Percentile**: Performance benchmark
- **Min/Max Response**: Best and worst performance
- **Trend Analysis**: Performance over time

## API Integration

### REST API Endpoints

```php
// Get current reachability status
GET /api/v1/reachability/status

// Get historical data
GET /api/v1/reachability/history

// Get location-specific data
GET /api/v1/reachability/locations
```

### Webhook Notifications

Configure webhooks for real-time alerts:

```json
{
  "event": "site_down",
  "site_url": "https://your-site.com",
  "timestamp": "2025-01-15T10:30:00Z",
  "location": "us-east",
  "response_time": null,
  "error": "Connection timeout"
}
```

## Alert System

### Alert Types

- **Downtime Alerts**: Site goes offline
- **Performance Alerts**: Response time thresholds
- **Recovery Alerts**: Site comes back online
- **Maintenance Alerts**: Scheduled maintenance notifications

### Notification Channels

- **Email**: Direct email notifications
- **Slack**: Slack channel integration
- **Discord**: Discord webhook notifications
- **Webhooks**: Custom webhook endpoints
- **SMS**: Text message alerts (premium)

### Alert Configuration

```php
'alerts' => [
    'downtime' => [
        'enabled' => true,
        'threshold' => 300, // 5 minutes
        'channels' => ['email', 'slack']
    ],
    'performance' => [
        'enabled' => true,
        'threshold' => 5000, // 5 seconds
        'channels' => ['email']
    ]
]
```

## Troubleshooting

### Common Issues

#### False Positive Alerts
- **Cause**: Temporary network issues
- **Solution**: Increase alert thresholds, add retry logic

#### Inconsistent Results
- **Cause**: CDN or load balancer issues
- **Solution**: Monitor specific endpoints, use internal monitoring

#### Slow Response Times
- **Cause**: Server overload or network latency
- **Solution**: Optimize server performance, upgrade hosting

### Debug Information

Enable debug logging for detailed monitoring data:

```php
'debug' => [
    'enabled' => true,
    'log_level' => 'info',
    'include_response_headers' => true
]
```

## Best Practices

### Monitoring Strategy

1. **Multiple Locations**: Monitor from user locations
2. **Realistic Intervals**: Balance frequency with resource usage
3. **Alert Thresholds**: Set appropriate alert levels
4. **Backup Monitoring**: Use multiple monitoring services

### Performance Optimization

- **Caching**: Implement proper caching strategies
- **CDN**: Use Content Delivery Networks
- **Database**: Optimize database queries
- **Assets**: Compress and optimize assets

### Alert Management

- **Escalation**: Set up alert escalation policies
- **On-call Rotation**: Rotate alert responsibilities
- **Documentation**: Document response procedures
- **Testing**: Regularly test alert systems

## Integration Examples

### Slack Integration

```php
// Slack webhook configuration
'slack' => [
    'webhook_url' => 'https://hooks.slack.com/...',
    'channel' => '#monitoring',
    'username' => 'Site Monitor',
    'icon' => ':warning:'
]
```

### Custom Dashboard

```javascript
// Fetch monitoring data
fetch('/api/v1/reachability/status')
    .then(response => response.json())
    .then(data => {
        updateDashboard(data);
    });
```

## API Reference

### Response Format

```json
{
  "status": "online",
  "response_time": 245,
  "location": "us-east",
  "timestamp": "2025-01-15T10:30:00Z",
  "http_status": 200,
  "checked_at": "2025-01-15T10:30:00Z"
}
```

### Error Codes

- `CONNECTION_TIMEOUT`: Unable to connect
- `HTTP_ERROR`: HTTP error response
- `SSL_ERROR`: SSL certificate issues
- `DNS_ERROR`: DNS resolution failure

## Security Considerations

- **API Authentication**: Secure token management
- **Data Privacy**: No sensitive data collection
- **Access Control**: Admin-only monitoring access
- **Encryption**: HTTPS-only communications

## Performance Impact

- **Minimal Load**: External monitoring doesn't affect site performance
- **Efficient Checks**: Optimized check routines
- **Caching**: Intelligent result caching
- **Rate Limiting**: Built-in rate limiting protection

## Support

- [Configuration Guide](../Configuration.md)
- [Troubleshooting Guide](../Troubleshooting.md)
- [API Documentation](../api/API-Reference.md)