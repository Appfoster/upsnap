# Troubleshooting

This guide helps you resolve common issues with the Site Monitor plugin.

## Common Issues

### Plugin Installation Issues

#### Plugin Not Appearing in Control Panel

**Symptoms:**
- Plugin installed but not visible in Settings → Plugins

**Solutions:**
1. Clear Craft's cache:
   ```bash
   php craft clear-caches/all
   ```

2. Check file permissions:
   ```bash
   chmod -R 755 craft/plugins/site-monitor
   ```

3. Verify plugin structure:
   - Ensure `composer.json` exists
   - Check that `src/SiteMonitor.php` is present
   - Verify namespace matches directory structure

4. Reinstall via Composer:
   ```bash
   composer remove appfoster/site-monitor
   composer require appfoster/site-monitor
   ```

#### Composer Installation Fails

**Symptoms:**
- Composer errors during installation

**Solutions:**
1. Update Composer:
   ```bash
   composer self-update
   ```

2. Clear Composer cache:
   ```bash
   composer clear-cache
   ```

3. Check PHP version compatibility:
   ```bash
   php --version
   ```

4. Install with verbose output:
   ```bash
   composer require appfoster/site-monitor -vvv
   ```

### Configuration Issues

#### Environment Variables Not Loading

**Symptoms:**
- Plugin shows configuration errors
- API calls failing

**Solutions:**
1. Verify `.env` file exists in project root
2. Check variable syntax:
   ```env
   SITE_MONITOR_API_URL=https://eagle-eye.appfoster.site
   SITE_MONITOR_API_TOKEN=your-token-here
   ```

3. Restart web server after changes
4. Check file permissions on `.env`

#### API Connection Failed

**Symptoms:**
- "Connection timeout" or "API unreachable" errors

**Solutions:**
1. Verify API URL is correct
2. Check network connectivity:
   ```bash
   curl -I https://eagle-eye.appfoster.site
   ```

3. Test API token validity
4. Check firewall/proxy settings
5. Verify SSL certificates

### Monitoring Issues

#### Checks Not Running

**Symptoms:**
- Refresh buttons not working
- No monitoring data appearing

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify API configuration
3. Check Craft's queue system:
   ```bash
   php craft queue/list
   ```

4. Review plugin logs in `storage/logs/`

#### Inaccurate Monitoring Results

**Symptoms:**
- False positives or negatives
- Inconsistent data

**Solutions:**
1. Clear plugin cache
2. Verify target URLs are accessible
3. Check monitoring intervals
4. Review API response data

### Performance Issues

#### Slow Page Loads

**Symptoms:**
- Control Panel slow when accessing plugin
- Long response times for checks

**Solutions:**
1. Enable caching in plugin settings
2. Increase PHP memory limit
3. Optimize database queries
4. Check server resources

#### High Memory Usage

**Symptoms:**
- PHP memory exhaustion errors

**Solutions:**
1. Increase PHP memory limit in `php.ini`:
   ```ini
   memory_limit = 256M
   ```

2. Process large scans in batches
3. Enable result caching
4. Monitor server resources

### JavaScript/CSS Issues

#### Assets Not Loading

**Symptoms:**
- Broken styling or missing functionality
- JavaScript errors in console

**Solutions:**
1. Clear Craft asset caches:
   ```bash
   php craft clear-caches/assets
   ```

2. Publish assets:
   ```bash
   php craft plugin/site-monitor/publish-assets
   ```

3. Check file permissions on asset directories
4. Verify asset bundle configuration

#### Console Errors

**Symptoms:**
- JavaScript errors in browser console

**Solutions:**
1. Check for missing dependencies
2. Verify asset file integrity
3. Clear browser cache
4. Check network tab for failed requests

## Debug Mode

### Enabling Debug Mode

Add to your `config/app.php`:

```php
return [
    'modules' => [
        'debug' => [
            'class' => 'yii\debug\Module',
            'allowedIPs' => ['127.0.0.1', '::1', '192.168.1.*'],
        ],
    ],
];
```

### Using Debug Toolbar

1. Access debug toolbar in bottom-right corner
2. Check **Database** tab for query performance
3. Review **Request** tab for API calls
4. Monitor **Timeline** for execution times

### Logging

#### Enable Plugin Logging

Add to your `config/app.php`:

```php
'components' => [
    'log' => [
        'targets' => [
            [
                'class' => 'yii\log\FileTarget',
                'levels' => ['error', 'warning', 'info'],
                'categories' => ['appfoster\sitemonitor\*'],
                'logFile' => '@storage/logs/site-monitor.log',
            ],
        ],
    ],
],
```

#### View Logs

Check plugin logs at `storage/logs/site-monitor.log`

### API Debugging

#### Test API Connection

```bash
# Test basic connectivity
curl -X GET https://eagle-eye.appfoster.site/v1/status

# Test with authentication
curl -X GET https://eagle-eye.appfoster.site/v1/status \
  -H "Authorization: Bearer your-token-here"
```

#### API Response Analysis

1. Check HTTP status codes
2. Verify JSON response format
3. Review error messages
4. Test with different parameters

## Error Messages

### Common Error Messages

#### "API Token Invalid"

**Cause:** Incorrect or expired API token
**Solution:** Verify token in environment variables

#### "Connection Timeout"

**Cause:** Network or API service issues
**Solution:** Check connectivity and retry

#### "SSL Certificate Error"

**Cause:** SSL/TLS configuration issues
**Solution:** Verify SSL certificates and ciphers

#### "Rate Limit Exceeded"

**Cause:** Too many API requests
**Solution:** Reduce monitoring frequency or upgrade API plan

### Plugin-Specific Errors

#### "Plugin not initialized"

**Cause:** Plugin installation incomplete
**Solution:** Reinstall plugin and clear caches

#### "Missing configuration"

**Cause:** Required settings not configured
**Solution:** Complete plugin configuration

#### "Database error"

**Cause:** Database connectivity issues
**Solution:** Check database configuration and permissions

## System Diagnostics

### Health Check Commands

```bash
# Check Craft installation
php craft install/check

# Test database connection
php craft db/test

# Check plugin status
php craft plugin/list
```

### Server Requirements Check

```bash
# PHP version and extensions
php -m | grep -E "(curl|json|mbstring|openssl)"

# Disk space
df -h

# Memory usage
free -h
```

### Network Diagnostics

```bash
# DNS resolution
nslookup eagle-eye.appfoster.site

# Network connectivity
ping -c 4 eagle-eye.appfoster.site

# SSL certificate check
openssl s_client -connect eagle-eye.appfoster.site:443 -servername eagle-eye.appfoster.site
```

## Getting Help

### Support Resources

1. **Documentation**: Check this wiki for detailed guides
2. **GitHub Issues**: Search existing issues or create new ones
3. **Community Forums**: Ask the Craft CMS community
4. **Professional Support**: Contact Appfoster support

### Information to Provide

When seeking help, include:

- Craft CMS version
- PHP version
- Plugin version
- Error messages (full text)
- Steps to reproduce
- Server environment details
- Recent changes made

### Emergency Contacts

- **Critical Issues**: support@appfoster.com
- **Security Issues**: security@appfoster.com
- **GitHub Issues**: https://github.com/Appfoster/site-monitor/issues

## Prevention

### Best Practices

1. **Regular Backups**: Backup before major changes
2. **Staging Environment**: Test changes in staging first
3. **Monitoring**: Monitor your monitoring system
4. **Documentation**: Keep records of changes and configurations

### Maintenance Schedule

- **Daily**: Check for critical alerts
- **Weekly**: Review monitoring results and trends
- **Monthly**: Update plugin and dependencies
- **Quarterly**: Review and optimize configuration