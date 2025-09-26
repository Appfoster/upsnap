# Domain Check

Monitor domain registration, DNS configuration, and domain health.

## Overview

Comprehensive domain monitoring including registration status, DNS records, WHOIS information, and domain expiration tracking.

## Features

### Domain Registration
- **Expiration Monitoring**: Domain renewal alerts
- **Registrar Information**: Current registrar details
- **Registration Dates**: Creation and update dates
- **Transfer Lock**: Domain transfer protection status

### DNS Health
- **DNS Resolution**: Domain name resolution testing
- **Record Validation**: A, AAAA, CNAME, MX record checks
- **Nameserver Status**: Authoritative nameserver health
- **Propagation Monitoring**: DNS change propagation tracking

### WHOIS Information
- **Contact Details**: Administrative and technical contacts
- **Privacy Protection**: WHOIS privacy service status
- **Domain Status**: Registry status codes
- **Name Server Changes**: Nameserver update monitoring

## Configuration

### Domain Settings

```php
'domain_check' => [
    'check_interval' => 86400,    // Daily checks
    'alert_days' => [90, 30, 7], // Expiration alert days
    'dns_checks' => true,         // Enable DNS monitoring
    'whois_updates' => true,      // Monitor WHOIS changes
    'subdomains' => [             // Additional domains to check
        'www.example.com',
        'api.example.com'
    ]
]
```

### Monitoring Scope

- **Primary Domain**: Main website domain
- **Subdomains**: Additional subdomains
- **Related Domains**: Connected domain properties
- **CDN Domains**: Content delivery network domains

## Usage

### Domain Dashboard

1. Navigate to **Site Monitor → Domain Check**
2. View domain expiration and DNS status
3. Review WHOIS information updates
4. Monitor DNS propagation

### Domain Status Indicators

- **Active**: Domain properly registered and resolving
- **Expiring Soon**: Domain expires within alert threshold
- **Expired**: Domain has expired
- **DNS Issues**: DNS resolution problems detected

## API Integration

### Domain Endpoints

```php
// Get domain information
GET /api/v1/domain/info

// Check domain status
GET /api/v1/domain/status

// Get DNS records
GET /api/v1/domain/dns

// Get WHOIS data
GET /api/v1/domain/whois
```

## DNS Monitoring

### Record Types Monitored

#### Essential Records
- **A Records**: IPv4 address mapping
- **AAAA Records**: IPv6 address mapping
- **CNAME Records**: Canonical name aliases
- **MX Records**: Mail server configuration

#### Advanced Records
- **TXT Records**: Text information (SPF, DKIM)
- **SRV Records**: Service location records
- **CAA Records**: Certificate authority authorization
- **DNSSEC**: Domain name system security extensions

### DNS Health Checks

```php
'dns_health' => [
    'check_records' => ['A', 'AAAA', 'MX', 'TXT'],
    'verify_propagation' => true,
    'nameserver_checks' => true,
    'dnssec_validation' => true
]
```

## Domain Registration

### Expiration Monitoring

#### Alert Thresholds
- **90 Days**: Long-term renewal planning
- **30 Days**: Active renewal preparation
- **7 Days**: Urgent renewal action
- **1 Day**: Critical renewal warning

#### Auto-Renewal
- **Registrar Settings**: Auto-renewal configuration
- **Payment Methods**: Renewal payment verification
- **Contact Updates**: Administrative contact validation

### Transfer Protection
- **Transfer Lock**: Domain transfer prevention
- **Authorization Codes**: Transfer authorization
- **Registrar Changes**: Transfer between registrars

## WHOIS Monitoring

### Information Tracking

#### Contact Information
- **Administrative Contact**: Domain owner details
- **Technical Contact**: Technical administration
- **Billing Contact**: Payment and billing information
- **Registrant**: Legal domain owner

#### Domain Metadata
- **Creation Date**: Domain registration date
- **Update Date**: Last modification date
- **Expiration Date**: Domain expiry date
- **Registrar**: Current registrar information

### Privacy Services
- **WHOIS Privacy**: Contact information protection
- **Proxy Services**: Anonymous registration services
- **GDPR Compliance**: Privacy regulation compliance

## Reporting

### Domain Reports

```json
{
  "domain": "example.com",
  "status": "active",
  "expiration_date": "2025-01-15T00:00:00Z",
  "days_remaining": 245,
  "registrar": "Example Registrar",
  "nameservers": [
    "ns1.example.com",
    "ns2.example.com"
  ],
  "dns_status": "healthy"
}
```

### Alert Types
- **Expiration Alerts**: Domain renewal notifications
- **DNS Changes**: DNS configuration modifications
- **WHOIS Updates**: Contact or registrar changes
- **Security Alerts**: Domain security issues

## Troubleshooting

### Common Domain Issues

#### DNS Problems
- **Propagation Delays**: DNS changes not propagated
- **Incorrect Records**: Wrong DNS record configuration
- **Nameserver Issues**: Authoritative nameserver problems
- **Caching Issues**: DNS cache not updating

#### Registration Issues
- **Expired Domains**: Domain renewal failures
- **Transfer Problems**: Domain transfer complications
- **Registrar Issues**: Registrar service problems
- **Payment Failures**: Renewal payment issues

### Resolution Steps

```php
'troubleshooting' => [
    'dns_lookup_tools' => ['dig', 'nslookup', 'host'],
    'whois_tools' => ['whois', 'domaintools'],
    'propagation_check' => 'https://dnspropagation.net/',
    'registrar_support' => true
]
```

## Best Practices

### Domain Management
- **Auto-Renewal**: Enable automatic renewal
- **Multiple Contacts**: Backup contact information
- **Regular Audits**: Periodic domain portfolio review
- **Security Measures**: Domain lock and transfer protection

### DNS Configuration
- **Redundant Nameservers**: Multiple nameserver setup
- **Monitoring**: Continuous DNS health monitoring
- **Backup Records**: DNS record backups
- **Change Management**: Controlled DNS modifications

## Integration

### Registrar Integration
```php
'registrar_api' => [
    'provider' => 'namecheap',    // Registrar name
    'api_key' => 'your_api_key',  // API authentication
    'auto_renewal' => true,       // Enable auto-renewal
    'alert_integration' => true   // Registrar alerts
]
```

### DNS Management
- **Cloudflare Integration**: DNS management API
- **AWS Route 53**: Hosted zone monitoring
- **Google Cloud DNS**: Cloud DNS monitoring
- **Azure DNS**: Microsoft DNS monitoring

## API Reference

### Domain Object

```json
{
  "domain": "example.com",
  "status": "active",
  "created": "2020-01-15T00:00:00Z",
  "updated": "2023-01-15T00:00:00Z",
  "expires": "2025-01-15T00:00:00Z",
  "registrar": {
    "name": "Example Registrar",
    "url": "https://example-registrar.com"
  },
  "nameservers": [
    "ns1.example.com",
    "ns2.example.com"
  ],
  "contacts": {
    "admin": {...},
    "tech": {...},
    "billing": {...}
  }
}
```

## Support

- [ICANN Domain Guidelines](https://www.icann.org/resources/pages/registries-registrars-2013-09-16-en)
- [DNS Best Practices](https://tools.ietf.org/html/rfc1035)
- [Troubleshooting Guide](../Troubleshooting.md)