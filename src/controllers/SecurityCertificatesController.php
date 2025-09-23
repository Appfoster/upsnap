<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\SiteMonitor;
use Craft;
use yii\web\Response;
use DateTime;

class SecurityCertificatesController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
    }

    public function actionIndex(): Response
    {
        $data = [];

        try {
            $response = SiteMonitor::$plugin->apiService->post('healthcheck', [
                'url' => SiteMonitor::$healthCheckUrl,
                'checks' => ["ssl"],
            ]);

            // Transform API response to our expected format for SSL certificate
            if (isset($response['result'])) {
                $result = $response['result'];
                $ssl = $result['details']['ssl'] ?? null;
                $meta = $ssl['meta'] ?? [];

                $data = [
                    'status' => $ssl['ok'] ? 'ok' : 'error',
                    'message' => $result['summary']['message'] ?? 'SSL check completed',
                    'url' => $response['url'] ?? '',
                    'checkedAt' => $response['checkedAt'] ?? '',
                    'details' => [
                        'daysRemaining' => $meta['daysRemaining'] ?? null,
                        'issuer' => $meta['issuer'] ?? '',
                        'notAfter' => !empty($meta['notAfter'])
                            ? (new DateTime($meta['notAfter']))->format('d M Y H:i:s')
                            : '',
                        'notBefore' => !empty($meta['notBefore'])
                            ? (new DateTime($meta['notBefore']))->format('d M Y H:i:s')
                            : '',
                        'subject' => $meta['subject'] ?? '',
                        'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',

                        // --- Mocked Additional Data ---
                        'certificateMetadata' => [
                            'serialNumber' => '06:C3:23:C8:00:CC:FC:60:EA:49:7A:C8:07:1A:8E:45:81:D9',
                            'signatureAlgorithm' => 'ecdsa-with-SHA384',
                            'publicKeyAlgorithm' => 'ECC',
                        ],
                        'domainCoverage' => [
                            'san' => ['appfoster.com', 'www.appfoster.com'],
                            'wildcard' => false,
                        ],
                        'chain' => [
                            [
                                'depth' => 0,
                                'type' => 'leaf',
                                'info' => [
                                    'subject' => ['commonName' => 'appfoster.com'],
                                    'issuer' => ['countryName' => 'US', 'organizationName' => "Let's Encrypt", 'commonName' => 'E8'],
                                    'notBefore' => '2025-09-22T21:27:21.000Z',
                                    'notAfter' => '2025-12-21T21:27:20.000Z',
                                    'isExpired' => true,
                                    'daysUntilExpiry' => 89,
                                    'publicKey' => ['algorithm' => 'ECC', 'curve' => 'P-256'],
                                    'serialNumber' => '06:C3:23:C8:00:CC:FC:60:EA:49:7A:C8:07:1A:8E:45:81:D9',
                                    'signatureAlgorithm' => 'ecdsa-with-SHA384',
                                    'extensions' => [
                                        'keyUsage' => 'Present',
                                        'extKeyUsage' => 'Present',
                                        'basicConstraints' => ['isCA' => false],
                                    ],
                                ],
                            ],
                            [
                                'depth' => 1,
                                'type' => 'intermediate',
                                'info' => [
                                    'subject' => ['countryName' => 'US', 'organizationName' => "Let's Encrypt", 'commonName' => 'E8'],
                                    'issuer' => ['countryName' => 'US', 'organizationName' => 'Internet Security Research Group', 'commonName' => 'ISRG Root X1'],
                                    'notBefore' => '2024-03-13T00:00:00.000Z',
                                    'notAfter' => '2027-03-12T23:59:59.000Z',
                                    'isExpired' => false,
                                    'daysUntilExpiry' => 12,
                                    'publicKey' => ['algorithm' => 'ECC', 'curve' => 'P-384'],
                                    'serialNumber' => '63:95:93:63:C2:4E:70:82:71:59:18:BF:C3:D7:ED:56',
                                    'signatureAlgorithm' => 'sha256WithRSAEncryption',
                                ],
                            ],
                            [
                                'depth' => 2,
                                'type' => 'root',
                                'info' => [
                                    'subject' => ['countryName' => 'US', 'organizationName' => 'Internet Security Research Group', 'commonName' => 'ISRG Root X1'],
                                    'issuer' => ['countryName' => 'US', 'organizationName' => 'Internet Security Research Group', 'commonName' => 'ISRG Root X1'],
                                    'notBefore' => '2015-06-04T11:04:38.000Z',
                                    'notAfter' => '2035-06-04T11:04:38.000Z',
                                    'isExpired' => false,
                                    'daysUntilExpiry' => 3541,
                                    'publicKey' => ['algorithm' => 'RSA', 'bits' => 4096],
                                    'serialNumber' => '00:82:10:CF:B0:D2:40:E3:59:44:63:E0:BB:63:82:8B:00',
                                    'signatureAlgorithm' => 'sha256WithRSAEncryption',
                                ],
                            ],
                        ],
                    ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching SSL certificate status: ' . $e->getMessage());
        }

        return $this->renderTemplate('site-monitor/security-certificates/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'SSL Certificates'),
            'selectedSubnavItem' => 'uptime',
        ]);
    }
}
