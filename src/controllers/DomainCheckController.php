<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\SiteMonitor;
use Craft;
use yii\web\Response;
use DateTime;

class DomainCheckController extends BaseController
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
                'checks' => ['domain'],
            ]);
            if (isset($response['result']['details']['domain']['meta']['errors'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . implode(', ', $response['result']['details']['domain']['meta']['errors']));
                return $this->renderTemplate('site-monitor/domain-check/_index', [
                    'data' => [
                        'status' => 'error',
                        'error' => $response['result']['details']['domain']['meta']['errors'] ?? [],
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($response['result']['durationMs']) ? $response['result']['durationMs'] . ' ms' : '-',
                    ],
                    'plugin' => SiteMonitor::$plugin,
                    'title' => Craft::t('site-monitor', 'Domain Check'),
                    'selectedSubnavItem' => 'domain-check',
                ]);
            }

            // Transform API response to our expected format
            if (isset($response['result'])) {
                $result = $response['result'];
                $domain = $result['details']['domain'] ?? null;
                $meta = $domain['meta'] ?? [];

                $data = [
                    'status' => $result['summary']['ok'] ? 'ok' : 'error',
                    'message' => $result['summary']['message'] ?? 'Domain check completed',
                    'url' => $response['url'] ?? '',
                    'checkedAt' => $response['checkedAt'] ?? '',
                    'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',
                    'details' => [
                        'cname' => $meta['cname'] ?? '',
                        'host' => $meta['host'] ?? '',
                        'ipv4' => $meta['ipv4'] ?? [],
                        'ipv6' => $meta['ipv6'] ?? null,
                        'mxCount' => $meta['mxCount'] ?? 0,
                        'nsCount' => $meta['nsCount'] ?? 0,
                        'txtCount' => $meta['txtCount'] ?? 0,
                        'supported' => $meta['supported'] ?? false,
                        'domainExpirationDate' => $meta['domainExpirationDate'] ?? '',
                        'domainDays' => $meta['domainDays'] ?? 0,
                        'domainExpired' => $meta['domainExpired'] ?? 0,
                        'domainExpiring' => $meta['domainExpiring'] ?? 0,
                        'domainChanged' => $meta['domainChanged'] ?? 0,
                        'lastUpdatedInRdapDb' => $meta['lastUpdatedInRdapDb'] ?? '',
                        'domainRegistered' => $meta['domainRegistered'] ?? '',
                        'lastChanged' => $meta['lastChanged'] ?? '',
                        'domainStatusCodes' => $meta['domainStatusCodes'] ?? [],
                    ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching domain check data: ' . $e->getMessage());
        }

        return $this->renderTemplate('site-monitor/domain-check/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Domain Check'),
            'selectedSubnavItem' => 'domain-check',
        ]);
    }
}
