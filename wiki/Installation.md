# Installation

This guide will help you install and set up the Site Monitor plugin for Craft CMS.

## Requirements

Before installing Site Monitor, ensure your system meets these requirements:

- **Craft CMS**: 5.0.0 or later
- **PHP**: 8.2 or later
- **Database**: MySQL 8.0+ or PostgreSQL 13.0+
- **Composer**: Latest version

## Installation Methods

### Method 1: Composer Installation (Recommended)

1. Open your terminal and navigate to your Craft project root directory
2. Run the following command:

```bash
composer require appfoster/site-monitor
```

3. In the Craft Control Panel, navigate to **Settings → Plugins**
4. Locate **Site Monitor** in the plugin list
5. Click **Install** to activate the plugin

### Method 2: Manual Installation

1. Download the plugin archive from the [GitHub releases page](https://github.com/Appfoster/site-monitor/releases)
2. Extract the archive to your `craft/plugins/` directory
3. Rename the extracted folder to `site-monitor`
4. In the Craft Control Panel, go to **Settings → Plugins**
5. Find **Site Monitor** and click **Install**

## Post-Installation Setup

After installation, complete these setup steps:

### 1. Environment Configuration

Add the following variables to your `.env` file:

```env
# Site Monitor API Configuration
SITE_MONITOR_API_URL=https://eagle-eye.appfoster.site
SITE_MONITOR_API_TOKEN=your-api-token-here

# Site to Monitor
SITE_MONITOR_URL=https://your-site.com
```

### 2. Plugin Configuration

1. Go to **Settings → Plugins → Site Monitor** in the Control Panel
2. Configure basic settings:
   - Enable/disable monitoring
   - Set monitoring intervals
   - Configure notification settings

### 3. Verify Installation

1. Navigate to **Site Monitor** in the main navigation
2. You should see the monitoring dashboard
3. Try running a test check to ensure everything is working

## Troubleshooting Installation

### Plugin Not Appearing
- Clear Craft's cache: `php craft clear-caches/all`
- Check file permissions on the plugin directory
- Verify the plugin files are in the correct location

### Composer Issues
- Ensure Composer is up to date: `composer self-update`
- Clear Composer's cache: `composer clear-cache`
- Check for PHP version compatibility

### Permission Errors
- Ensure the web server has write permissions to the `storage/` directory
- Check that the plugin directory is readable by the web server

## Next Steps

Once installed, you can:
- [Configure the plugin](Configuration.md)
- [Learn about features](features/Reachability-Monitoring.md)
- [Set up monitoring](Usage.md)

## Support

If you encounter issues during installation:
- Check the [Troubleshooting](Troubleshooting.md) guide
- [Create an issue](https://github.com/Appfoster/site-monitor/issues) on GitHub
- Contact support at support@appfoster.com