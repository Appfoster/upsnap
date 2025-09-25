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

            if (isset($response['result']['details']['ssl']['error'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details']['ssl']['error']);
                return $this->renderTemplate('site-monitor/security-certificates/_index', [
                    'data' => [
                        'status' => 'error',
                        'error' => $response['result']['details']['ssl']['error'] ?? 'Something went wrong',
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($response['result']['durationMs']) ? $response['result']['durationMs'] . ' ms' : '-',
                    ],
                    'plugin' => SiteMonitor::$plugin,
                    'title' => Craft::t('site-monitor', 'Security Certificates'),
                    'selectedSubnavItem' => 'security-certificates',
                ]);
            }

            // Transform API response to our expected format for SSL certificate
            if (isset($response['result'])) {
                $result = $response['result'];
                $ssl = $result['details']['ssl'] ?? null;
                $meta = $ssl['meta'] ?? [];

                $leafCertificate = null;
                if (isset($meta['chain']) && is_array($meta['chain'])) {
                    foreach ($meta['chain'] as $cert) {
                        if (($cert['depth'] ?? null) === 0 && ($cert['type'] ?? null) === 'leaf') {
                            $leafCertificate = $cert['info'] ?? null;
                            break;
                        }
                    }
                }

                $data = [
                    'status' => $ssl['ok'] ? 'ok' : 'error',
                    'message' => $result['summary']['message'] ?? 'SSL check completed',
                    'url' => $response['url'] ?? '',
                    'checkedAt' => $response['checkedAt'] ?? '',
                    'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',
                    'details' => [
                        'leafCertificate' => $leafCertificate,
                        'domainCoverage' => $meta['domainCoverage'] ?? [],
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
