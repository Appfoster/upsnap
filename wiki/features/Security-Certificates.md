# Security Certificates

Monitor SSL/TLS certificate validity, expiry dates, and security configurations.

## Overview

Ensure your site's SSL certificates are valid and properly configured with comprehensive certificate monitoring.

## Features

### Certificate Validation
- **Expiry Monitoring**: Track certificate expiration dates
- **Chain Validation**: Verify certificate chains
- **Issuer Information**: Certificate authority details
- **Domain Coverage**: SAN (Subject Alternative Names)

### Security Checks
- **Protocol Support**: TLS version validation
- **Cipher Suites**: Encryption strength verification
- **Certificate Transparency**: CT log monitoring
- **Revocation Status**: CRL/OCSP checking

### Alerts & Notifications
- **Expiry Warnings**: 30, 14, 7, and 1-day alerts
- **Security Issues**: Immediate alerts for vulnerabilities
- **Renewal Reminders**: Automated renewal notifications
- **Compliance Monitoring**: PCI DSS and security standards

## Configuration

### Certificate Settings

```php
'certificates' => [
    'check_interval' => 3600,     // Check every hour
    'alert_days' => [30, 14, 7, 1], // Alert thresholds
    'include_chain' => true,      // Check certificate chain
    'verify_ocsp' => true         // Check revocation status
]
```

### Domain Monitoring

- **Primary Domain**: Main site certificate
- **Subdomains**: Individual subdomain certificates
- **Wildcard Certificates**: *.domain.com coverage
- **Multi-domain**: SAN certificate validation

## Usage

### Certificate Dashboard

1. Navigate to **Site Monitor → Security Certificates**
2. View certificate details and expiry information
3. Check certificate chain status
4. Review security recommendations

### Certificate Information

- **Subject**: Certificate owner information
- **Issuer**: Certificate authority details
- **Validity Period**: Issue and expiry dates
- **Serial Number**: Unique certificate identifier
- **Signature Algorithm**: Cryptographic algorithm used

## API Integration

### Certificate Endpoints

```php
// Get certificate information
GET /api/v1/certificates/info

// Check certificate status
GET /api/v1/certificates/status

// Get expiry alerts
GET /api/v1/certificates/alerts
```

## Security Standards

### Supported Protocols
- TLS 1.3 (recommended)
- TLS 1.2 (minimum acceptable)
- SSL 3.0/TLS 1.0/1.1 (deprecated)

### Cipher Suite Requirements
- Strong encryption algorithms
- Perfect forward secrecy
- Secure key exchange methods

## Troubleshooting

### Common Certificate Issues

- **Expired Certificates**: Immediate renewal required
- **Chain Issues**: Missing intermediate certificates
- **Domain Mismatch**: Certificate doesn't match domain
- **Revocation**: Certificate has been revoked

### SSL Configuration

```apache
# Apache SSL Configuration
SSLEngine on
SSLCertificateFile /path/to/certificate.crt
SSLCertificateKeyFile /path/to/private.key
SSLCertificateChainFile /path/to/intermediate.crt
```

## Best Practices

### Certificate Management
- **Automated Renewal**: Use ACME/Lets Encrypt
- **Monitoring**: Regular certificate checks
- **Backup**: Secure private key backups
- **Rotation**: Regular certificate rotation

### Security Hardening
- **HSTS**: HTTP Strict Transport Security
- **HPKP**: Public Key Pinning (deprecated)
- **CAA Records**: Certificate Authority Authorization
- **CT Logs**: Certificate Transparency monitoring

## Integration

### ACME Integration
```php
'acme' => [
    'provider' => 'letsencrypt',
    'auto_renewal' => true,
    'renewal_days' => 30
]
```

### Monitoring Dashboards
- Integration with SSL monitoring services
- Certificate expiry calendars
- Security compliance reports

## API Reference

### Certificate Object

```json
{
  "subject": "CN=example.com",
  "issuer": "CN=Let's Encrypt Authority X3",
  "valid_from": "2024-01-01T00:00:00Z",
  "valid_to": "2024-04-01T00:00:00Z",
  "serial_number": "1234567890",
  "signature_algorithm": "SHA256-RSA",
  "key_size": 2048,
  "domains": ["example.com", "www.example.com"]
}
```

## Support

- [SSL Configuration Guide](https://ssl-config.mozilla.org/)
- [Certificate Authority List](https://ccadb-public.securecode.com/)
- [Troubleshooting Guide](../Troubleshooting.md)