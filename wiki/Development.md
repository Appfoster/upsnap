# Development

This guide covers development aspects of the Site Monitor plugin.

## Project Structure

```
site-monitor/
├── src/
│   ├── SiteMonitor.php          # Main plugin class
│   ├── Constants.php            # Plugin constants
│   ├── assetbundles/            # Frontend assets
│   │   └── monitor/
│   │       ├── CommonAsset.php          # Shared assets
│   │       ├── ReachabilityAsset.php    # Reachability assets
│   │       ├── DomainCheckAsset.php     # Domain check assets
│   │       ├── MixedContentAsset.php    # Mixed content assets
│   │       ├── BrokenLinksAsset.php     # Broken links assets
│   │       ├── LighthouseAsset.php      # Lighthouse assets
│   │       └── SecurityCertificatesAsset.php
│   ├── controllers/             # Control Panel controllers
│   │   ├── BaseController.php
│   │   ├── ReachabilityController.php
│   │   ├── DomainCheckController.php
│   │   ├── MixedContentController.php
│   │   ├── BrokenLinksController.php
│   │   ├── LighthouseController.php
│   │   └── SecurityCertificatesController.php
│   ├── models/                  # Data models
│   │   └── Settings.php
│   ├── services/                # Business logic
│   │   ├── ApiService.php
│   │   └── HistoryService.php
│   └── templates/               # Twig templates
│       ├── _index.twig
│       ├── reachability/
│       ├── domain-check/
│       ├── mixed-content/
│       ├── broken-links/
│       ├── lighthouse/
│       └── security-certificates/
├── composer.json
├── README.md
└── wiki/                       # Documentation
```

## Architecture

### Plugin Class (SiteMonitor.php)

The main plugin class handles:

- Plugin initialization
- Component registration
- Route registration
- Asset bundle management
- Settings management

### Controllers

Each monitoring section has a dedicated controller:

- **BaseController**: Common functionality and admin access control
- **Feature Controllers**: Handle specific monitoring features
- **Actions**: Process requests and return data

### Services

Business logic is separated into services:

- **ApiService**: Handles external API communication
- **HistoryService**: Manages historical data storage and retrieval

### Models

Data structures and validation:

- **Settings**: Plugin configuration and validation

### Asset Bundles

Frontend assets are organized by feature:

- **CommonAsset**: Shared CSS/JS for all sections
- **Feature Assets**: Section-specific styling and scripts

## Development Setup

### Prerequisites

- PHP 8.2+
- Composer
- Node.js (for asset compilation)
- Craft CMS development environment

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Appfoster/site-monitor.git
   cd site-monitor
   ```

2. Install dependencies:
   ```bash
   composer install
   ```

3. Set up development environment:
   ```bash
   cp .env.example .env
   # Configure environment variables
   ```

4. Install for development:
   ```bash
   composer install --dev
   ```

### Testing

#### Unit Tests

Run the test suite:

```bash
composer test
```

#### Code Quality

Check code quality:

```bash
composer cs-check    # Check coding standards
composer cs-fix      # Fix coding standards
composer analyze     # Static analysis
```

## Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages
6. **Push** to your fork
7. **Create** a Pull Request

### Coding Standards

Follow these standards:

- **PSR-12**: PHP coding standards
- **Craft Conventions**: Follow Craft CMS patterns
- **Documentation**: Document all public methods
- **Testing**: Write tests for new features

### Code Style

```php
<?php

namespace appfoster\sitemonitor\controllers;

use Craft;
use craft\web\Controller;
use appfoster\sitemonitor\SiteMonitor;

/**
 * Example controller with proper documentation
 */
class ExampleController extends Controller
{
    /**
     * Action description
     *
     * @param string $param Parameter description
     * @return Response
     */
    public function actionExample(string $param): Response
    {
        // Implementation
    }
}
```

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add new monitoring check type
fix: resolve API timeout issue
docs: update installation guide
refactor: improve asset bundle organization
```

## API Development

### Adding New Checks

1. **Define Constants**: Add to `Constants.php`
2. **Create Controller**: Extend `BaseController`
3. **Add Routes**: Register in `SiteMonitor.php`
4. **Create Templates**: Add Twig templates
5. **Asset Bundles**: Create feature-specific assets
6. **API Integration**: Update `ApiService` if needed

### Example: New Check Implementation

```php
// 1. Add to Constants.php
public const CHECK_NEW_FEATURE = 'new_feature';

// 2. Create NewFeatureController.php
class NewFeatureController extends BaseController
{
    public function actionIndex(): Response
    {
        $data = SiteMonitor::$plugin->apiService->post('healthcheck', [
            'url' => SiteMonitor::$healthCheckUrl,
            'checks' => [Constants::CHECK_NEW_FEATURE],
        ]);

        return $this->renderTemplate('site-monitor/new-feature/_index', [
            'data' => $data,
        ]);
    }
}

// 3. Add route in SiteMonitor.php
'site-monitor/new-feature' => 'site-monitor/new-feature/index',
```

## Asset Development

### Compiling Assets

For development asset compilation:

```bash
npm install
npm run dev      # Development build
npm run build    # Production build
npm run watch    # Watch for changes
```

### Asset Organization

- **SCSS**: Use modular SCSS files
- **JavaScript**: ES6+ with proper imports
- **Images**: Optimize and compress
- **Fonts**: Use web-safe fonts when possible

## Testing

### Writing Tests

Create tests in `tests/` directory:

```php
<?php

namespace appfoster\sitemonitor\tests;

use Codeception\Test\Unit;
use appfoster\sitemonitor\SiteMonitor;

class SiteMonitorTest extends Unit
{
    public function testPluginInstance()
    {
        $this->assertInstanceOf(SiteMonitor::class, SiteMonitor::$plugin);
    }
}
```

### Test Categories

- **Unit Tests**: Test individual components
- **Integration Tests**: Test API interactions
- **Functional Tests**: Test full workflows
- **UI Tests**: Test user interface functionality

## Deployment

### Release Process

1. **Version Bump**: Update version in `composer.json`
2. **Changelog**: Update `CHANGELOG.md`
3. **Tests**: Ensure all tests pass
4. **Build Assets**: Compile production assets
5. **Tag Release**: Create Git tag
6. **Publish**: Push to Packagist

### Versioning

Follow semantic versioning:

- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

## Security

### Best Practices

- **Input Validation**: Validate all user inputs
- **Output Escaping**: Escape all outputs
- **CSRF Protection**: Use Craft's CSRF protection
- **Access Control**: Check permissions properly
- **API Security**: Secure API communications

### Security Checklist

- [ ] No sensitive data in logs
- [ ] Secure API token storage
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Access control checks

## Performance

### Optimization Techniques

- **Caching**: Cache API responses
- **Lazy Loading**: Load assets as needed
- **Database Optimization**: Use proper indexing
- **Asset Optimization**: Minify and compress assets
- **Query Optimization**: Optimize database queries

### Monitoring Performance

Track performance metrics:

- Response times
- Memory usage
- Database query performance
- Asset loading times

## Documentation

### Updating Documentation

1. Update relevant wiki pages
2. Update inline code documentation
3. Update README.md if needed
4. Test documentation links

### Documentation Standards

- **Clear**: Use simple language
- **Complete**: Cover all features
- **Current**: Keep up to date
- **Accessible**: Easy to find and navigate

## Support

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Check wiki and README
- **Community**: Craft CMS forums and Discord
- **Professional**: Appfoster support

### Issue Templates

Use issue templates for:

- Bug reports
- Feature requests
- Security issues
- Documentation issues

## License

This plugin is proprietary software. See LICENSE file for details.