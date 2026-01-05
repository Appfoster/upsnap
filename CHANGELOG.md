# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [1.0.10] - 2026-01-05

### Added
- Support for a “My Integrations” tab in the integrations listing.

### Chore
- Minor bug fixes and UI refinements.

## [1.0.9] - 2026-01-02

### Added
- Skeleton loaders across dashboard cards to provide visual feedback while data is loading.
- Registration banner on the dashboard for unregistered users.
- Option to enable or disable notification channels and integrations.
- Status pages listing with actions support.

### Updated
- Dashboard cards to fetch their data independently via AJAX calls.
- URL validation logic to support a wider range of monitoring URLs with strict validation rules.
- Lighthouse check monitoring interval slider with updated interval options.
- Health check detail pages to replace the refresh button with a **Fetch Now** button for retrieving recent data.
- Health check pages cleaned up to remove unnecessary data and align behavior with the WebApp.
- Monitor polling logic with state updates and internal improvements.

### Chore
- Minor bug fixes and UI refinements.

## [1.0.8] - 2025-12-24

### Added
- Response time interval selector in the plugin response time chart.
- Display of Space ID for Google Chat and Discord integrations.
- Breadcrumbs added to pages.

### Updated
- Monitoring interval controls replaced with sliders in the monitor add/edit forms to support custom values and align with WebApp behavior, respecting subscription plan limits.
- Improved URL validation to accept only valid URLs.
- Enhanced polling mechanism for monitors, including periodic general polling and targeted polling for recently added or updated monitors.
- Forced status and last check updates for paused monitors using the Reachability API.
- Fetch recent button added on health check cards to fetch the latest monitoring data.
- Time filter dropdown added in the response time chart on dashboard.

### Fixed
- Improved error handling to display accurate backend error messages instead of generic failures.
- Correct status display for paused monitors across statistics and dashboard cards.

### Chore
- Minor bug fixes and UI cleanups.

## [1.0.7] - 2025-12-19

### Added
- Dynamic minimum monitoring interval based on subscription plan.

### Updated
- Dashboard uptime percentage formatting.
- UI improvements for integrations and monitor forms.
- Improved handling when monitoring is paused.

### Fixed
- Removed monitor dependency from Test Integration.
- Fixed validation issues for Google Chat and Discord integrations.

### Chore
- Minor bug fixes and UI cleanups.

## [1.0.6] - 2025-12-11

### Added 
- New monitor listing and actions.
- New notification channels listing and actions.

### Updated
- Dashboard UI/UX

### Chores
- Minor bug fixes.

## [1.0.5] - 2025-11-13

### Fixed
- An issue where api key failed to add on fresh installs with default monitor.

## [1.0.4] - 2025-11-13

### Added
- User token field for monitoring history insights.
- Option to add new monitors for continous monitoring.
- Option to add/delete notification channel per monitor.
- Option to delete a monitor.
- Custom healthchek settings per service.


### Chore
- Minor bug fixes.

## [1.0.3] - 2025-11-03

### Added
- Subscription status based monitoring flag.
- Api token setup for registered user from dashboard.
- Auto addition of protocol if only domain is added.
- Custom craft headers to api calls.

### Chore
- Refactored the code base.
- Fixed few url's in readme that were incorrect.

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

[Unreleased]: https://github.com/Appfoster/upsnap/compare/1.0.10...HEAD
[1.0.10]: https://github.com/Appfoster/upsnap/releases/tag/1.0.10
[1.0.9]: https://github.com/Appfoster/upsnap/releases/tag/1.0.9
[1.0.8]: https://github.com/Appfoster/upsnap/releases/tag/1.0.8
[1.0.7]: https://github.com/Appfoster/upsnap/releases/tag/1.0.7
[1.0.6]: https://github.com/Appfoster/upsnap/releases/tag/1.0.6
[1.0.5]: https://github.com/Appfoster/upsnap/releases/tag/1.0.5
[1.0.4]: https://github.com/Appfoster/upsnap/releases/tag/1.0.4
[1.0.3]: https://github.com/Appfoster/upsnap/releases/tag/1.0.3
[1.0.2]: https://github.com/Appfoster/upsnap/releases/tag/1.0.2
[1.0.1]: https://github.com/Appfoster/upsnap/releases/tag/1.0.1
[1.0.0]: https://github.com/Appfoster/upsnap/releases/tag/1.0.0