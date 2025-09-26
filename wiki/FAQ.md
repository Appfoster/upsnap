# Frequently Asked Questions

Common questions and answers about the Site Monitor plugin.

## General Questions

### What is Site Monitor?

Site Monitor is a comprehensive monitoring plugin for Craft CMS that provides real-time insights into your website's health, performance, and security. It monitors uptime, SSL certificates, broken links, performance scores, and more.

### What monitoring services does it provide?

- **Reachability**: Site uptime and response times
- **Security Certificates**: SSL/TLS certificate monitoring
- **Broken Links**: Link integrity scanning
- **Lighthouse**: Performance and SEO analysis
- **Domain Check**: Domain health monitoring
- **Mixed Content**: HTTPS security validation

### Is it compatible with Craft 5?

Yes, Site Monitor is fully compatible with Craft CMS 5.0 and later versions.

## Installation & Setup

### How do I install the plugin?

**Via Composer (Recommended):**
```bash
composer require appfoster/site-monitor
```

**Manual Installation:**
1. Download from GitHub releases
2. Extract to `craft/plugins/site-monitor/`
3. Install via Control Panel

### What are the system requirements?

- **Craft CMS**: 5.0.0 or later
- **PHP**: 8.2 or later
- **Database**: MySQL 8.0+ or PostgreSQL 13.0+
- **Composer**: Latest version

### Do I need an API key?

Yes, you need an API token from the monitoring service. Configure it in your `.env` file:

```env
SITE_MONITOR_API_TOKEN=your-api-token-here
```

## Configuration

### How do I configure the plugin?

1. Add environment variables to `.env`
2. Go to **Settings → Plugins → Site Monitor**
3. Configure monitoring settings
4. Set up notification preferences

### What environment variables are required?

```env
SITE_MONITOR_API_URL=https://eagle-eye.appfoster.site
SITE_MONITOR_API_TOKEN=your-token-here
SITE_MONITOR_URL=https://your-site.com
```

### Can I monitor multiple sites?

Yes, you can configure multiple URLs in the plugin settings under "Monitoring URLs".

## Usage

### How often does it check my site?

By default, checks run every 5 minutes, but you can configure different intervals for different check types.

### Does it affect my site's performance?

No, the plugin monitors externally and doesn't impact your site's performance.

### Can I get email notifications?

Yes, configure notification emails in the plugin settings to receive alerts about issues.

### How do I view historical data?

Go to **Site Monitor → Reachability → History** to view uptime and performance history.

## Monitoring Features

### What does "Reachability" monitor?

Reachability checks your site's availability, response times, and HTTP status codes from multiple geographic locations.

### How does SSL certificate monitoring work?

The plugin checks certificate validity, expiry dates, issuer information, and certificate chain integrity.

### What is Lighthouse monitoring?

Lighthouse provides Google Lighthouse scores for Performance, Accessibility, Best Practices, and SEO.

### How does broken link detection work?

The plugin crawls your site and tests all internal and external links for validity.

### What is mixed content detection?

Mixed content detection finds HTTP resources (images, scripts, stylesheets) loaded on HTTPS pages, which can compromise security.

## Troubleshooting

### Why are my checks failing?

Common causes:
- Incorrect API configuration
- Network connectivity issues
- Firewall blocking requests
- Invalid target URLs

### How do I debug API issues?

1. Check your `.env` file for correct API settings
2. Verify API token validity
3. Test API connectivity manually
4. Check Craft logs for error messages

### Why is the plugin slow?

Possible causes:
- Large sites taking time to scan
- Network latency
- API service delays
- Insufficient server resources

### How do I clear the cache?

```bash
php craft clear-caches/all
```

## API & Integration

### Can I use the API directly?

Yes, the plugin provides API endpoints for custom integrations. See the [API Reference](api/API-Reference.md) for details.

### Is there a rate limit?

Yes, API requests are rate-limited. Check your API plan for specific limits.

### Can I integrate with other services?

Yes, you can use webhooks and API integrations to connect with Slack, Discord, monitoring dashboards, and other services.

## Billing & Plans

### How much does it cost?

Pricing depends on your monitoring needs. Contact Appfoster for current pricing and plans.

### What are the rate limits?

Rate limits vary by plan:
- Basic: 100 checks/hour
- Pro: 1000 checks/hour
- Enterprise: Custom limits

### Can I change plans?

Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.

## Security

### Is my data secure?

Yes, all monitoring data is encrypted in transit and at rest. API tokens are stored securely.

### Who has access to my monitoring data?

Only you and authorized users have access to your monitoring data. Data is not shared with third parties.

### How is API data protected?

API communications use HTTPS with certificate validation. Tokens are encrypted and never logged.

## Performance

### How accurate are the results?

Monitoring results are highly accurate, using the same techniques as professional monitoring services.

### Can I monitor behind a firewall?

Yes, but you'll need to configure your firewall to allow monitoring requests or use internal monitoring.

### What about CDN monitoring?

The plugin can monitor CDN-enabled sites and provides geographic testing from multiple locations.

## Development

### Can I contribute to the plugin?

Yes! See the [Development](Development.md) guide for contribution guidelines.

### How do I report bugs?

Create an issue on [GitHub](https://github.com/Appfoster/site-monitor/issues) with detailed information.

### Are there API endpoints for developers?

Yes, comprehensive API documentation is available in the [API Reference](api/API-Reference.md).

### Can I customize the monitoring?

Yes, the plugin is extensible. You can add custom checks and modify existing functionality.

## Support

### What support is available?

- **Documentation**: Comprehensive wiki and guides
- **Community**: Craft CMS forums and Discord
- **Professional**: Email support for licensed users
- **GitHub**: Issue tracking and feature requests

### How do I get help?

1. Check the [Troubleshooting](Troubleshooting.md) guide
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Contact support@appfoster.com for urgent issues

### What information should I provide when asking for help?

When seeking support, include:
- Craft CMS version
- Plugin version
- PHP version
- Error messages (full text)
- Steps to reproduce the issue
- Recent changes made

## Updates & Maintenance

### How do I update the plugin?

```bash
composer update appfoster/site-monitor
```

### Are updates automatic?

No, you need to manually update via Composer. Check for updates regularly.

### What's in each release?

See the [Changelog](Changelog.md) for detailed release notes.

### How do I rollback an update?

```bash
composer require appfoster/site-monitor:version-number
```

## Legal & Compliance

### What data is collected?

The plugin collects monitoring data about your site's performance and health. No personal user data is collected.

### Is it GDPR compliant?

Yes, the plugin is designed to be GDPR compliant and doesn't collect personal data.

### Can I use it for commercial sites?

Yes, the plugin can be used on commercial websites with appropriate licensing.

### What about data retention?

Monitoring data retention depends on your plan. Contact support for specific retention policies.

---

**Still have questions?** Check our [Troubleshooting](Troubleshooting.md) guide or [create an issue](https://github.com/Appfoster/site-monitor/issues).