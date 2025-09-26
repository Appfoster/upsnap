# Lighthouse

Run Google Lighthouse performance audits and monitor site quality metrics.

## Overview

Automated Lighthouse auditing to track website performance, accessibility, SEO, and best practices scores over time.

## Features

### Performance Metrics
- **First Contentful Paint (FCP)**: Time to first content render
- **Largest Contentful Paint (LCP)**: Time to largest content render
- **First Input Delay (FID)**: Responsiveness to user input
- **Cumulative Layout Shift (CLS)**: Visual stability measurement

### Quality Audits
- **Accessibility**: WCAG compliance and accessibility issues
- **SEO**: Search engine optimization recommendations
- **Best Practices**: Modern web development standards
- **Progressive Web App (PWA)**: PWA capability assessment

### Monitoring & Trends
- **Score Tracking**: Historical performance scores
- **Regression Detection**: Performance degradation alerts
- **Benchmarking**: Compare against industry standards
- **Custom Thresholds**: Configurable alert levels

## Configuration

### Lighthouse Settings

```php
'lighthouse' => [
    'check_interval' => 86400,    // Daily audits
    'device_type' => 'mobile',    // 'mobile' or 'desktop'
    'throttling' => 'simulated',  // Network throttling
    'categories' => [             // Audit categories
        'performance',
        'accessibility',
        'seo',
        'best-practices'
    ],
    'alert_thresholds' => [       // Score alert thresholds
        'performance' => 85,
        'accessibility' => 90,
        'seo' => 85
    ]
]
```

### Audit Configuration

- **Device Emulation**: Mobile or desktop testing
- **Network Conditions**: Simulated or applied throttling
- **Screen Resolution**: Viewport size settings
- **User Agent**: Browser identification string

## Usage

### Lighthouse Dashboard

1. Navigate to **Site Monitor → Lighthouse**
2. View current and historical scores
3. Review detailed audit results
4. Compare performance trends

### Score Categories

- **Performance (0-100)**: Loading and rendering speed
- **Accessibility (0-100)**: Usability for people with disabilities
- **Best Practices (0-100)**: Modern web development standards
- **SEO (0-100)**: Search engine optimization readiness

## API Integration

### Lighthouse Endpoints

```php
// Run lighthouse audit
POST /api/v1/lighthouse/audit

// Get latest results
GET /api/v1/lighthouse/results

// Get historical scores
GET /api/v1/lighthouse/history

// Get audit details
GET /api/v1/lighthouse/audit/{id}
```

## Audit Categories

### Performance Audits

#### Loading Performance
- **First Contentful Paint**: Time to first content
- **Speed Index**: Visual loading speed
- **Largest Contentful Paint**: Main content loading time
- **Time to Interactive**: Full interactivity time

#### Resource Optimization
- **Unused JavaScript**: Remove unused code
- **Render-blocking Resources**: Optimize critical resources
- **Image Optimization**: Compress and optimize images
- **Minification**: Minify CSS and JavaScript

### Accessibility Audits

#### Content Accessibility
- **Image Alt Text**: Descriptive alt attributes
- **Color Contrast**: Sufficient color contrast ratios
- **Heading Structure**: Proper heading hierarchy
- **Form Labels**: Accessible form elements

#### Navigation Accessibility
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus indicators
- **Screen Reader**: Screen reader compatibility
- **Language Declaration**: Proper lang attributes

### SEO Audits

#### Content Optimization
- **Meta Description**: Descriptive meta descriptions
- **Title Tags**: Unique and descriptive titles
- **Structured Data**: Schema markup implementation
- **Mobile Friendly**: Mobile-responsive design

#### Technical SEO
- **Page Speed**: Fast loading times
- **HTTPS**: Secure connection usage
- **Crawlability**: Search engine access
- **Internal Linking**: Proper link structure

## Reporting

### Audit Reports

```json
{
  "performance": {
    "score": 87,
    "metrics": {
      "fcp": 1800,
      "lcp": 2500,
      "cls": 0.05,
      "fid": 50
    }
  },
  "accessibility": {
    "score": 92,
    "issues": 3
  },
  "seo": {
    "score": 89,
    "opportunities": 5
  }
}
```

### Trend Analysis
- **Score History**: Performance over time
- **Regression Alerts**: Significant score drops
- **Improvement Tracking**: Positive changes monitoring
- **Benchmark Comparison**: Industry standard comparison

## Troubleshooting

### Common Issues

#### Performance Issues
- **Large Images**: Unoptimized image files
- **Blocking Resources**: Render-blocking CSS/JavaScript
- **Unused Code**: Dead code elimination needed
- **Server Response**: Slow server response times

#### Audit Failures
- **Network Errors**: Connectivity issues during audit
- **Timeout Issues**: Long-running page audits
- **JavaScript Errors**: Page errors preventing audit completion
- **Resource Loading**: Failed resource loading

### Optimization Strategies

```php
'optimizations' => [
    'image_compression' => true,
    'css_minification' => true,
    'js_minification' => true,
    'lazy_loading' => true,
    'preload_critical' => true
]
```

## Best Practices

### Performance Optimization
- **Image Optimization**: WebP format and responsive images
- **Code Splitting**: Dynamic imports and code splitting
- **Caching Strategy**: Effective caching headers
- **CDN Usage**: Content delivery network implementation

### Continuous Monitoring
- **Regular Audits**: Daily performance monitoring
- **Alert Configuration**: Performance regression alerts
- **Budget Setting**: Performance budget definitions
- **Team Integration**: Development team notifications

## Integration

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Lighthouse Audit
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: https://example.com
    configPath: .lighthouserc.json
```

### Monitoring Dashboards
- **Real-time Monitoring**: Live performance dashboards
- **Historical Trends**: Long-term performance analysis
- **Alert Integration**: Slack/Email notifications
- **Team Dashboards**: Shared performance metrics

## API Reference

### Lighthouse Result Object

```json
{
  "id": "audit_12345",
  "url": "https://example.com",
  "device": "mobile",
  "timestamp": "2024-01-15T10:00:00Z",
  "categories": {
    "performance": {
      "score": 87,
      "title": "Performance"
    },
    "accessibility": {
      "score": 92,
      "title": "Accessibility"
    },
    "seo": {
      "score": 89,
      "title": "SEO"
    }
  },
  "audits": [...]
}
```

## Support

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Troubleshooting Guide](../Troubleshooting.md)