# Upsnap

A comprehensive monitoring plugin for Craft CMS that provides real-time insights into your website's health, performance, and security.

![Plugin Banner - Add a banner image showing the plugin interface](https://via.placeholder.com/800x200/0073aa/white?text=Site+Monitor+Plugin+Banner)

## Features

Upsnap provides a complete suite of monitoring tools to keep your Craft CMS site healthy and performing optimally:

### 🔍 **Reachability Monitoring**
- Real-time uptime monitoring
- Response time tracking
- HTTP status code monitoring
- Geographic monitoring locations
- Historical uptime data and trends

### 🔒 **Security Certificates**
- SSL/TLS certificate validation
- Certificate expiry monitoring
- Certificate chain verification
- Domain coverage analysis
- Security protocol detection

### 🔗 **Broken Links Detection**
- Comprehensive link scanning
- Internal/external link analysis
- Status code reporting
- Anchor text and context
- Bulk link validation

### 📊 **Lighthouse Performance Scores**
- Google Lighthouse integration
- Performance, Accessibility, Best Practices, and SEO scores
- Mobile and desktop analysis
- Core Web Vitals metrics
- Performance recommendations

### 🌐 **Domain Health Check**
- DNS record validation
- Domain expiry monitoring
- WHOIS information
- Domain status codes
- IPv4/IPv6 support

### 🔄 **Mixed Content Detection**
- HTTP/HTTPS mixed content scanning
- Security vulnerability identification
- Content type analysis
- Automated detection and reporting

## Requirements

- **Craft CMS**: 5.0.0 or later
- **PHP**: 8.2 or later
- **Database**: MySQL 8.0+ or PostgreSQL 13.0+

## Installation

### Via Composer (Recommended)

1. Open your terminal and navigate to your Craft project root
2. Run the following command:

```bash
composer require appfoster/upsnap
```

3. In the Craft Control Panel, go to **Settings → Plugins**
4. Find **Upsnap** in the plugin list and click **Install**

### Manual Installation

1. Download the plugin files from the [GitHub repository](https://github.com/Appfoster/upsnap)
2. Extract the archive and place the `upsnap` folder in your `craft/plugins/` directory
3. In the Craft Control Panel, go to **Settings → Plugins**
4. Find **Upsnap** in the plugin list and click **Install**

## Configuration

### Environment Variables

Configure the following environment variables in your `.env` file:

```env
# Site to Monitor
SITE_MONITOR_URL=https://your-site.com
```

### Plugin Settings

After installation, configure the plugin through the Craft Control Panel:

1. Go to **Settings → Plugins → Upsnap**
2. Configure the following options:
   - **Enable Monitoring**: Toggle monitoring on/off
   - **Monitoring Interval**: Set check frequency (minutes)
   - **Notification Email**: Email for alerts
   - **Monitoring URLs**: Additional URLs to monitor

## Usage

### Accessing the Plugin

1. Log into your Craft Control Panel
2. Navigate to **Upsnap** in the main navigation
3. Choose from the available monitoring sections

### Monitoring Sections

#### Reachability
Monitor your site's uptime and response times.

![Reachability Dashboard - Screenshot showing uptime statistics and response times](https://via.placeholder.com/800x400/0073aa/white?text=Reachability+Dashboard+Screenshot)

#### Security Certificates
Check SSL certificate validity and security.

![Security Certificates - Screenshot showing certificate details and expiry information](https://via.placeholder.com/800x400/0073aa/white?text=Security+Certificates+Screenshot)

#### Broken Links
Scan for and identify broken links across your site.

![Broken Links Scanner - Screenshot showing broken links table with filtering options](https://via.placeholder.com/800x400/0073aa/white?text=Broken+Links+Scanner+Screenshot)

#### Lighthouse Scores
View Google Lighthouse performance metrics.

![Lighthouse Performance - Screenshot showing performance scores and metrics](https://via.placeholder.com/800x400/0073aa/white?text=Lighthouse+Performance+Screenshot)

#### Domain Check
Monitor domain health and DNS configuration.

![Domain Check - Screenshot showing domain information and DNS records](https://via.placeholder.com/800x400/0073aa/white?text=Domain+Check+Screenshot)

#### Mixed Content
Detect HTTP resources on HTTPS pages.

![Mixed Content Detection - Screenshot showing mixed content warnings](https://via.placeholder.com/800x400/0073aa/white?text=Mixed+Content+Detection+Screenshot)

### API Integration

The plugin integrates with external monitoring services. Configure your API credentials in the environment variables for full functionality.

## API Reference

### Available Checks

- `reachability` - Site availability and response times
- `security_certificates` - SSL/TLS certificate validation
- `broken_links` - Link integrity scanning
- `lighthouse` - Performance and SEO analysis
- `domain_check` - Domain health monitoring
- `mixed_content` - HTTPS security validation

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable monitoring |
| `monitoringInterval` | integer | `5` | Check interval in minutes |
| `notificationEmail` | string | `null` | Alert notification email |
| `monitoringUrls` | array | `[]` | Additional URLs to monitor |

## Troubleshooting

### Common Issues

**Plugin not appearing in Control Panel**
- Ensure the plugin is installed via Composer or manually placed in the correct directory
- Check file permissions on the plugin directory
- Clear Craft's cache: `php craft clear-caches/all`

**API Connection Failed**
- Verify environment variables are set correctly
- Check API endpoint availability
- Review API token permissions

**Monitoring Not Working**
- Confirm the target URL is accessible
- Check firewall and security settings
- Verify API service status

### Debug Mode

Enable Craft's debug mode to see detailed error messages:

```php
// config/app.php
return [
    'modules' => [
        'debug' => [
            'class' => 'yii\debug\Module',
            'allowedIPs' => ['127.0.0.1', '::1'],
        ],
    ],
];
```

## Development

### Project Structure

```
upsnap/
├── src/
│   ├── Upsnap.php          # Main plugin class
│   ├── Constants.php            # Plugin constants
│   ├── assetbundles/            # Frontend assets
│   ├── controllers/             # Control Panel controllers
│   ├── models/                  # Data models
│   ├── services/                # Business logic services
│   └── templates/               # Twig templates
├── composer.json
└── README.md
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Testing

Run the test suite:

```bash
composer test
```

## Support

### Documentation
- [Full Documentation](https://github.com/Appfoster/upsnap/wiki)
- [API Documentation](https://github.com/Appfoster/upsnap/wiki/API)

### Issue Tracking
- [GitHub Issues](https://github.com/Appfoster/upsnap/issues)
- [Changelog](https://github.com/Appfoster/upsnap/master/CHANGELOG.md)

### Contact
- **Email**: support@appfoster.com
- **Website**: [Appfoster](http://www.appfoster.com/)

## License

This plugin is proprietary software. See the LICENSE file for details.

---

**Built with ❤️ by [Appfoster](http://www.appfoster.com/)**

*Keep your Craft CMS sites healthy and performing at their best with Site Monitor.*