# Broken Links

Detect and monitor broken internal and external links across your website.

## Overview

Comprehensive link checking to maintain site integrity and user experience by identifying broken links, redirects, and accessibility issues.

## Features

### Link Discovery
- **Internal Links**: Check all internal page links
- **External Links**: Monitor outbound link validity
- **Resource Links**: Images, CSS, JavaScript files
- **Dynamic Content**: AJAX-loaded and JavaScript-generated links

### Link Validation
- **HTTP Status Codes**: 404, 500, 301, 302 detection
- **Response Time**: Slow-loading link identification
- **Content Type**: Verify linked resource types
- **Redirect Chains**: Detect redirect loops and long chains

### Content Analysis
- **Anchor Text**: Link text validation
- **Alt Text**: Image alt attribute checking
- **Link Context**: Surrounding content analysis
- **SEO Impact**: Broken link SEO consequences

## Configuration

### Link Checking Settings

```php
'broken_links' => [
    'check_interval' => 3600,     // Check every hour
    'max_redirects' => 5,         // Maximum redirect chain length
    'timeout' => 30,              // Request timeout in seconds
    'user_agent' => 'Site Monitor/1.0',
    'check_external' => true,     // Check external links
    'exclude_patterns' => [       // URL patterns to exclude
        '/admin/*',
        '/private/*'
    ]
]
```

### Content Types to Check

- **HTML Pages**: Standard web pages
- **Images**: JPG, PNG, GIF, SVG files
- **Stylesheets**: CSS files
- **JavaScript**: JS files
- **Documents**: PDF, DOC, XLS files

## Usage

### Link Checker Dashboard

1. Navigate to **Site Monitor → Broken Links**
2. View broken link reports
3. Filter by link type and status
4. Export link reports

### Link Status Types

- **200 OK**: Working links
- **301/302**: Redirects (may need attention)
- **404 Not Found**: Broken links
- **500 Server Error**: Server issues
- **Timeout**: Slow or unresponsive links

## API Integration

### Link Checking Endpoints

```php
// Get broken links report
GET /api/v1/links/broken

// Check specific URL
POST /api/v1/links/check
{
  "url": "https://example.com/page",
  "check_external": true
}

// Get link statistics
GET /api/v1/links/stats
```

## Crawling Strategy

### Site Crawling
- **Sitemap Integration**: Use XML sitemaps for crawling
- **Robots.txt Respect**: Honor robots.txt directives
- **Crawl Depth**: Configurable crawling depth
- **Rate Limiting**: Respectful crawling with delays

### Link Extraction
- **HTML Parsing**: Extract links from HTML content
- **JavaScript Links**: Handle dynamic link generation
- **CSS Imports**: Check @import and url() references
- **Meta Refresh**: Detect meta refresh redirects

## Reporting

### Link Reports

```json
{
  "total_links": 1250,
  "broken_links": 15,
  "redirects": 45,
  "external_links": 320,
  "response_times": {
    "average": 1.2,
    "slowest": 15.8
  }
}
```

### Export Formats
- **CSV**: Spreadsheet-compatible format
- **JSON**: API-friendly format
- **HTML**: Web-viewable reports
- **XML**: Machine-readable format

## Troubleshooting

### Common Link Issues

- **404 Errors**: Page moved or deleted
- **500 Errors**: Server configuration issues
- **Timeout Issues**: Slow servers or network problems
- **SSL Certificate Errors**: HTTPS link validation failures

### Performance Optimization

```php
'performance' => [
    'concurrent_requests' => 10,   // Parallel link checking
    'request_delay' => 100,        // Delay between requests (ms)
    'cache_results' => true,       // Cache successful checks
    'cache_ttl' => 3600            // Cache time-to-live
]
```

## Best Practices

### Link Maintenance
- **Regular Monitoring**: Daily/weekly link checks
- **Broken Link Alerts**: Immediate notification system
- **Redirect Management**: Proper 301 redirects for moved content
- **Content Updates**: Regular content review and updates

### SEO Considerations
- **Crawl Budget**: Optimize for search engine crawling
- **Internal Linking**: Maintain strong internal link structure
- **External Links**: Monitor outbound link quality
- **User Experience**: Ensure all links provide value

## Integration

### CMS Integration
- **Content Management**: Automatic link checking on publish
- **Link Suggestions**: Broken link replacement suggestions
- **Bulk Updates**: Mass link correction tools

### Analytics Integration
- **Traffic Impact**: Track broken link traffic loss
- **Conversion Tracking**: Monitor link-related conversions
- **User Behavior**: Analyze user interaction with links

## API Reference

### Link Object

```json
{
  "url": "https://example.com/broken-page",
  "status_code": 404,
  "status_text": "Not Found",
  "response_time": 2.1,
  "link_type": "internal",
  "found_on": "https://example.com/home",
  "anchor_text": "Learn More",
  "last_checked": "2024-01-15T10:30:00Z"
}
```

## Support

- [Link Checking Best Practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Troubleshooting Guide](../Troubleshooting.md)