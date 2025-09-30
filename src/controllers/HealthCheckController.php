<?php

namespace appfoster\upsnap\controllers;

use Craft;
use yii\web\Response;

use appfoster\upsnap\Upsnap;
use appfoster\upsnap\Constants;
use appfoster\upsnap\assetbundles\HealthCheckAsset;
use appfoster\upsnap\services\HealthCheckService;

class HealthCheckController extends BaseController
{
    public $service;
    
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        HealthCheckAsset::register($this->view);
        $this->service = new HealthCheckService($this);
    }

    public function actionBrokenLinks(): Response
    {
        $data = [];

        try {
            $response = Upsnap::$plugin->apiService->post('healthcheck', [
                'url' => Upsnap::getMonitoringUrl(),
                'checks' => ['broken_links'],
            ]);

            if (isset($response['result']['details']['broken_links']['error'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details']['broken_links']['error']);
                return $this->renderTemplate('upsnap/broken-links/_index', [
                    'data' => [
                        'status' => 'error',
                        'error' => $response['result']['details']['broken_links']['error'] ?? 'Something went wrong',
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'brokenLinks' => [],
                        'duration' => isset($response['result']['durationMs']) ? $response['result']['durationMs'] . ' ms' : '-',
                    ],
                    'title' => Craft::t('upsnap', 'Broken Links'),
                    'selectedSubnavItem' => 'broken-links',
                ]);
            }

            $brokenLinksMeta = $response['result']['details']['broken_links']['meta'] ?? [];
            $isOk = $response['result']['details']['broken_links']['ok'] ?? true;

            $brokenLinks = [];

            // Extract broken links if present
            if (!empty($brokenLinksMeta['brokenLinks'])) {
                foreach ($brokenLinksMeta['brokenLinks'] as $page) {
                    $items = $page['items'] ?? [];
                    foreach ($items as $item) {
                        $brokenLinks[] = [
                            'url' => $item['url'] ?? '',
                            'pageUrl' => $item['page'] ?? '',
                            'statusCode' => $item['result'] ?? '',
                            'type' => !empty($item['external']) ? 'external' : 'internal',
                            'anchorText' => $item['name'] ?? $item['title'] ?? '',
                            'title' => $item['title'] ?? '',
                            'culprit' => $item['culprit'] ?? '',
                            'resolved' => !empty($item['resolved']),
                            'classification' => $item['classification'] ?? '',
                            'refUrl' => $item['ref_url'] ?? '',
                            'rid' => $item['rid'] ?? null,
                        ];
                    }
                }
            }

            $data = [
                'status' => $isOk ? 'ok' : 'error',
                'message' => $isOk ? 'All links are working fine' : 'Some broken links detected',
                'url' => $response['url'] ?? '',
                'checkedAt' => $response['checkedAt'] ?? '',
                'brokenLinks' => $brokenLinks,
                'details' => [
                    'totalPagesChecked' => $brokenLinksMeta['pagesChecked'] ?? 0,
                    'totalLinksScanned' => $brokenLinksMeta['checked'] ?? 0,
                    'errorsCount' => $brokenLinksMeta['broken'] ?? 0,
                ],
            ];
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching broken links data: ' . $e->getMessage());
        }

        return $this->renderTemplate('upsnap/healthcheck/broken-links', [
            'data' => $data,
            'title' => Craft::t('upsnap', 'Broken Links'),
            'selectedSubnavItem' => 'broken-links',
        ]);
    }

    public function actionDomainCheck(): Response
    {
        $data = [];

        try {
            $response = Upsnap::$plugin->apiService->post('healthcheck', [
                'url' => Upsnap::getMonitoringUrl(),
                'checks' => ['domain'],
            ]);
            if (isset($response['result']['details']['domain']['meta']['errors'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . implode(', ', $response['result']['details']['domain']['meta']['errors']));
                return $this->renderTemplate('upsnap/healthcheck/domain-check', [
                    'data' => [
                        'status' => 'error',
                        'error' => $response['result']['details']['domain']['meta']['errors'] ?? [],
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($response['result']['durationMs']) ? $response['result']['durationMs'] . ' ms' : '-',
                    ],
                    'plugin' => Upsnap::$plugin,
                    'title' => Craft::t('upsnap', 'Domain Check'),
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

        return $this->renderTemplate('upsnap/healthcheck/domain-check', [
            'data' => $data,
            'plugin' => Upsnap::$plugin,
            'title' => Craft::t('upsnap', 'Domain Check'),
            'selectedSubnavItem' => 'domain-check',
        ]);
    }

    public function actionLighthouse(): Response
    {
        $data = [];
        try {
            $response = Upsnap::$plugin->apiService->post('healthcheck', [
                'url' => Upsnap::getMonitoringUrl(),
                'checks' => ["lighthouse"],
                'strategy' => Craft::$app->getRequest()->getParam('device', 'desktop')
            ]);

            if (isset($response['result'])) {
                $result = $response['result'];
                $lh = $result['details']['lighthouse'] ?? [];

                $data = [
                    "url" => $response['url'] ?? '',
                    "checkedAt" => $response['checkedAt'] ?? '',
                    "result" => [
                        "summary" => [
                            "ok" => $result['summary']['ok'] ?? true,
                            "score" => $result['summary']['score'] ?? 100,
                            "message" => $result['summary']['message'] ?? 'checks completed',
                        ],
                        "details" => [
                            "lighthouse" => $lh,
                        ],
                        "durationMs" => $result['durationMs'] ?? 0,
                    ],
                ];
            }
        } catch (\Throwable $e) {
            Craft::error('Error fetching lighthouse scores: ' . $e->getMessage(), __METHOD__);
            Craft::$app->getSession()->setError('Error fetching lighthouse scores: ' . $e->getMessage());
        }

        // ✅ Return JSON if it’s an Ajax request
        if (Craft::$app->getRequest()->getIsAjax()) {
            return $this->asJson($data);
        }

        return $this->renderTemplate('upsnap/healthcheck/lighthouse', [
            'data' => $data,
            'title' => Craft::t('upsnap', 'Lighthouse'),
            'selectedSubnavItem' => 'lighthouse',
        ]);
    }

    public function actionMixedContent(): Response
    {
        $data = [];

        try {
            $response = Upsnap::$plugin->apiService->post('healthcheck', [
                'url' => Upsnap::getMonitoringUrl(),
                'checks' => ['mixed_content'],
            ]);
            if (isset($response['result']['details']['mixed_content']['error'])) {
                // Craft::$app->getSession()->setError('Something went wrong: ' . implode(', ', $response['result']['details']['mixed_content']['error']));
                return $this->renderTemplate('upsnap/healthcheck/mixed-content', [
                    'data' => [
                        'status' => 'error',
                        'error' => $response['result']['details']['mixed_content']['error'] ?? 'Unknown error',
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($response['result']['durationMs']) ? $response['result']['durationMs'] . ' ms' : '-',
                    ],
                    'plugin' => Upsnap::$plugin,
                    'title' => Craft::t('upsnap', 'Mixed Content Check'),
                    'selectedSubnavItem' => 'mixed-content',
                ]);
            }

            // Transform API response to our expected format
            if (isset($response['result'])) {
                $result = $response['result'];
                $mixedContent = $result['details']['mixed_content'] ?? null;
                $meta = $mixedContent['meta'] ?? [];

                $data = [
                    'status' => $result['summary']['ok'] ? 'ok' : 'error',
                    'message' => $result['summary']['message'] ?? 'Mixed Content check completed',
                    'url' => $response['url'] ?? '',
                    'checkedAt' => $response['checkedAt'] ?? '',
                    'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',
                    'details' => [
                        'mixedCount' => $meta['mixedCount'] ?? 0,
                        'mixedContentItems' => $meta['mixedContentItems'] ?? [],
                    ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching mixed content check data: ' . $e->getMessage());
        }

        return $this->renderTemplate('upsnap/healthcheck/mixed-content', [
            'data' => $data,
            'title' => Craft::t('upsnap', 'Mixed Content Check'),
            'selectedSubnavItem' => 'mixed-content',
        ]);
    }

    public function actionReachability(): Response
    {
        $data = [];
        $url = Upsnap::getMonitoringUrl();

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_REACHABILITY);
        }

        try {
            $response = $this->service->getHealthcheck($url, ['uptime']);

            if (isset($response['result']['details']['uptime']['error'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details']['uptime']['error']);
                throw new \Exception($response['result']['details']['uptime']['error']);
            }

            // Transform API response to our expected format
            if (isset($response['result'])) {
                $result = $response['result'];
                $uptime = $result['details']['uptime'] ?? null;
                $meta = $uptime['meta'] ?? [];

                $data = [
                    'data' => [
                        'status' => $result['summary']['ok'] ? 'ok' : 'error',
                        'message' => $result['summary']['message'] ?? 'Status check completed',
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',
                        'details' => [
                            'httpStatus' => $meta['statusCode'] ?? 0,
                            'finalURL' => $meta['finalURL'] ?? '',
                            'redirects' => $meta['redirects'] ?? null,
                            'resolvedIPs' => $meta['resolvedIPs'] ?? [],
                            'server' => $meta['server'] ?? '',
                            'contentType' => $meta['contentType'] ?? '',
                            'contentLength' => $meta['contentLength'] ?? 0,
                            'pageTitle' => $meta['title'] ?? '',
                            'tls' => $meta['tls'] ?? null,
                            'monitoredFrom' => $meta['monitoredFrom'] ?? null,
                        ]
                    ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching uptime status: ' . $e->getMessage());
            $data = [
                'data' => [
                    'status' => 'error',
                    'error' => $e->getMessage(),
                    'url' => $url,
                ]
            ];
        }

        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_REACHABILITY);
        return $this->service->sendResponse($data, Constants::SUBNAV_ITEM_REACHABILITY['template']);
    }

    public function actionSecurityCertificates(): Response
    {
        $data = [];
        $url = Upsnap::getMonitoringUrl();

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_REACHABILITY);
        }

        try {
            $response = $this->service->getHealthcheck($url, ['ssl']);

            if (isset($response['result']['details']['ssl']['error'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details']['ssl']['error']);
                throw new \Exception($response['result']['details']['ssl']['error']);
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
                   'data' => [
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
                   ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching SSL certificate status: ' . $e->getMessage());
            $data = [
                'data' => [
                    'status' => 'error',
                    'error' => $e->getMessage(),
                    'url' => $url,
                ]
            ];
        }

        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_SECURITY_CERTIFICATES);
        return $this->service->sendResponse($data, Constants::SUBNAV_ITEM_SECURITY_CERTIFICATES['template']);
    }

    public function actionHistory(): Response
    {
        $request = Craft::$app->getRequest();

        // Get filter parameters from request
        $startDate = $request->getParam('startDate', (new \DateTime('-15 days'))->format('Y-m-d'));
        $endDate = $request->getParam('endDate', (new \DateTime('now'))->format('Y-m-d'));
        $status = $request->getParam('status', 'all');
        $type = $request->getParam('type', 'all');

        // Convert dates for internal use
        $startDateTime = (new \DateTime($startDate))->format('Y-m-d H:i:s');
        $endDateTime = (new \DateTime($endDate . ' 23:59:59'))->format('Y-m-d H:i:s');
        $history = [];
        try {
            $history = Upsnap::$plugin->historyService->getHistory(
                'uptime',
                $startDate,
                $endDate
            );
        } catch (\Throwable $e) {
            \Craft::error('Error fetching uptime history: ' . $e->getMessage(), __METHOD__);
        }

        // Filter by status if specified
        if ($status !== 'all') {
            $history = array_filter($history, function ($record) use ($status) {
                return $record['status'] === $status;
            });
        }

        // Filter by type if specified
        if ($type !== 'all') {
            $history = array_filter($history, function ($record) use ($type) {
                return strtolower($record['type']) === strtolower($type);
            });
        }

        // Filter by date range
        $history = array_filter($history, function ($record) use ($startDateTime, $endDateTime) {
            return $record['timestamp'] >= $startDateTime && $record['timestamp'] <= $endDateTime;
        });

        // Calculate summary stats
        $totalChecks = count($history);
        $succeededChecks = count(array_filter($history, fn($r) => $r['status'] === 'succeeded'));
        $failedChecks = count(array_filter($history, fn($r) => $r['status'] === 'failed'));
        $warningChecks = count(array_filter($history, fn($r) => $r['status'] === 'warning'));

        $uptimePercentage = $totalChecks > 0 ? round(($succeededChecks / $totalChecks) * 100, 1) : 0;



        $variables = [
            'history' => array_values($history), // Re-index array after filtering
            'filters' => [
                'startDate' => $startDate,
                'endDate' => $endDate,
                'status' => $status,
                'type' => $type
            ],
            'stats' => [
                'total' => $totalChecks,
                'succeeded' => $succeededChecks,
                'failed' => $failedChecks,
                'warning' => $warningChecks,
                'uptimePercentage' => $uptimePercentage
            ],
            'title' => Craft::t('upsnap', 'Reachability History'),
            'selectedSubnavItem' => 'reachability',
        ];

        return $this->renderTemplate('upsnap/healthcheck/reachability-history', $variables);
    }
}
