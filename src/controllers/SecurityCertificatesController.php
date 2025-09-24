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
                        'chain' => $meta['chain'] ?? [],
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
