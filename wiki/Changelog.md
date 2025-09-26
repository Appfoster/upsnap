# Changelog

All notable changes to the Site Monitor plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release preparation
- Comprehensive monitoring features
- API integration with external monitoring service
- Asset bundle organization and optimization

### Changed
- Refactored code structure following Craft CMS standards
- Improved asset management with separate bundles per feature
- Enhanced configuration management with constants

### Fixed
- Various code quality improvements
- Asset loading optimizations
- Template organization

## [1.0.0] - 2025-01-15

### Added
- **Reachability Monitoring**: Real-time uptime and response time monitoring
- **Security Certificates**: SSL/TLS certificate validation and expiry monitoring
- **Broken Links Detection**: Comprehensive link scanning and validation
- **Lighthouse Performance**: Google Lighthouse scores and metrics
- **Domain Health Check**: DNS and domain registration monitoring
- **Mixed Content Detection**: HTTPS security validation
- **Historical Data**: Uptime and performance trend analysis
- **Alert System**: Email notifications for monitoring issues
- **API Integration**: RESTful API for custom integrations
- **Multi-site Support**: Monitor multiple URLs simultaneously
- **Geographic Monitoring**: Global monitoring from multiple locations

### Technical Features
- **Craft CMS 5.0+ Compatibility**: Full support for latest Craft version
- **PHP 8.2+ Support**: Modern PHP features and performance
- **Asset Bundles**: Organized frontend assets with dependency management
- **Service Architecture**: Clean separation of business logic
- **Configuration Management**: Environment-based configuration
- **Error Handling**: Comprehensive error handling and logging
- **Caching**: Intelligent caching for improved performance

### Security
- **API Token Security**: Secure token storage and transmission
- **Input Validation**: Comprehensive input sanitization
- **Access Control**: Admin-only access with proper permissions
- **HTTPS Enforcement**: Secure API communications
- **Data Encryption**: Encrypted data storage and transmission

## [0.9.0] - 2024-12-01 (Beta Release)

### Added
- Core monitoring functionality
- Basic API integration
- Initial asset bundles
- Plugin architecture setup

### Changed
- Improved code organization
- Enhanced error handling

### Fixed
- Various installation and configuration issues
- Asset loading problems

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

## Version Policy

This plugin follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Release Schedule

- **Major Releases**: Quarterly (Q1, Q4)
- **Minor Releases**: Monthly
- **Patch Releases**: As needed for critical fixes
- **Beta Releases**: 2-4 weeks before stable releases

## Support Policy

- **Current Version**: Full support and updates
- **Previous Version**: Security updates only (6 months)
- **Legacy Versions**: No support (after 12 months)

## Migration Guide

### Upgrading from 0.x to 1.0

#### Configuration Changes
- Move API settings to environment variables
- Update plugin settings in Control Panel
- Review notification configurations

#### API Changes
- Update API endpoints if using direct API calls
- Review authentication methods
- Check rate limiting policies

#### Template Changes
- Update custom templates for new structure
- Review asset bundle usage
- Check for deprecated template variables

## Future Releases

### Planned for 1.1.0
- Advanced alerting system
- Custom monitoring dashboards
- API rate limit management
- Enhanced reporting features

### Planned for 1.2.0
- Mobile app for monitoring
- Slack/Discord integrations
- Advanced analytics
- Performance optimization tools

### Planned for 2.0.0
- Multi-tenant support
- Advanced API features
- Machine learning insights
- Predictive monitoring

## Contributing to Changelog

When contributing to this project:

1. **Keep entries brief** but descriptive
2. **Group similar changes** together
3. **Use consistent formatting** across entries
4. **Include issue/PR references** when applicable
5. **Test changes** before documenting

### Example Entry

```
### Added
- New monitoring check for SSL certificate chains ([#123](https://github.com/Appfoster/site-monitor/issues/123))
- Support for custom monitoring intervals

### Fixed
- API timeout handling for large sites
- Memory leak in link scanning process
```

## Release Notes

Detailed release notes are available for each version:

- [v1.0.0 Release Notes](https://github.com/Appfoster/site-monitor/releases/tag/v1.0.0)
- [v0.9.0 Release Notes](https://github.com/Appfoster/site-monitor/releases/tag/v0.9.0)

## Getting Help

- **Documentation**: [Wiki](https://github.com/Appfoster/site-monitor/wiki)
- **Issues**: [GitHub Issues](https://github.com/Appfoster/site-monitor/issues)
- **Support**: support@appfoster.com

---

**Legend**: 🔴 Critical | 🟡 Important | 🟢 Minor | 🔵 Info