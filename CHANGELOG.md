# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.0.2] - 2025-10-09

### Fixed
- Missing plugin icon in unistalled state.

## [1.0.1] - 2025-10-08

### Added
- icon-mask.svg file for missing icon before plugin install.

### Fixed
- Page loading text not visible in lighthouse page when device changed or refreshed.
- Device selection referesed on page reload.

### Chore
- Moved save button in settings page to action bar.
- Added craft notification in place of alert on entering invalid url.

## [1.0.0] - 2025-10-08

### Added
- **Initial Release** - Complete site monitoring plugin for Craft CMS 5.0+
- **Reachability Monitoring** - Monitor site uptime and response times
- **Security Certificates** - SSL/TLS certificate validation and expiry tracking
- **Broken Links Detection** - Comprehensive link checking for internal and external URLs
- **Lighthouse Performance Audits** - Automated Google Lighthouse scoring
- **Domain Health Monitoring** - Domain registration and DNS health tracking
- **Mixed Content Detection** - Identify HTTP resources on HTTPS pages
- **Real-time Dashboard** - Control panel interface with monitoring status
- **Configurable Alert System** - Email notifications for monitoring failures
- **Plugin Settings** - Comprehensive configuration options
- **Asset Management** - Organized asset bundles for optimal loading
- **Comprehensive Documentation** - Complete wiki with guides

### Technical
- Craft CMS 5.0+ compatibility
- PHP 8.2+ support with modern features
- PSR-4 autoloading structure
- Composer dependency management
- Database integration with Craft's layer
- Feature-specific asset bundles
- Comprehensive error handling and logging

### Security
- HTTPS enforcement and secure communication
- Input validation and sanitization
- CSRF and XSS protection
- Security headers implementation

### Performance
- Optimized database queries
- Smart caching strategies
- Asset minification and optimization
- Background processing for monitoring tasks

[Unreleased]: https://github.com/Appfoster/upsnap/compare/1.0.2...HEAD
[1.0.2]: https://github.com/Appfoster/upsnap/releases/tag/1.0.2
[1.0.1]: https://github.com/Appfoster/upsnap/releases/tag/1.0.1
[1.0.0]: https://github.com/Appfoster/upsnap/releases/tag/1.0.0