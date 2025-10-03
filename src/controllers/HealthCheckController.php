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
        $url = Upsnap::getMonitoringUrl();

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_REACHABILITY);
        }
 
        $data = [];

        try {
            $paramName = Constants::SUBNAV_ITEM_BROKEN_LINKS['apiLabel'];
            $response = $this->service->getHealthcheck($url, [$paramName]);

            if (isset($response['result']['details'][$paramName]['error'])) {
                $errorMsg = $response['result']['details'][$paramName]['error'];
                Craft::$app->getSession()->setError('Something went wrong: ' . $errorMsg);
                throw new \Exception($errorMsg);
            }

            $brokenLinksMeta = $response['result']['details'][$paramName]['meta'] ?? [];
            $isOk = $response['result']['details'][$paramName]['ok'] ?? true;

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
                            'type' => !empty($item['external']) ? Constants::BROKEN_LINKS_TYPE['external'] : Constants::BROKEN_LINKS_TYPE['internal'],
                            'anchorText' => $item['name'] ?? $item['title'] ?? '',
                            'title' => $item['title'] ?? '',
                            'culprit' => $item['culprit'] ?? '',
                            'resolved' => !empty($item['resolved']),
                            'classification' => $item['classification'] ?? '',
                            'refUrl' => $item['ref_url'] ?? '',
                            'rid' => $item['rid'] ?? null,
                            'external' => $item['external'] ?? false,
                            'result' => $item['result'] ?? '',
                        ];
                    }
                }
            }

            $data = [
                'data' => [
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
                ]
            ];

        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching broken links data: ' . $e->getMessage());
            $data = [
                'data' => [
                    'status' => 'error',
                    'error' => $e->getMessage(),
                    'url' => $url,
                ]
            ];
        }

        $isAjax = Craft::$app->getRequest()->getIsAjax();
        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_BROKEN_LINKS, $isAjax);

        if ($isAjax) {
            return $this->asJson($data);
        }

        return $this->service->sendResponse($data, Constants::SUBNAV_ITEM_BROKEN_LINKS['template']);
    }

    public function actionDomainCheck(): Response
    {
        $url = Upsnap::getMonitoringUrl();
        $isAjax = Craft::$app->getRequest()->getIsAjax();

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_DOMAIN_CHECK);
        }
        $data = [];

        if ($isAjax) {
            try {
                $paramName = Constants::SUBNAV_ITEM_DOMAIN_CHECK['apiLabel'];
                $response = $this->service->getHealthcheck($url, [$paramName]);
                if (isset($response['result']['details'][$paramName]['meta']['errors'])) {
                    $errors = $response['result']['details'][$paramName]['meta']['errors'][0];
                    throw new \Exception($errors);
                }
    
                // Transform API response to our expected format
                if (isset($response['result'])) {
                    $result = $response['result'];
                    $domain = $result['details'][$paramName] ?? null;
                    $meta = $domain['meta'] ?? [];
                    $isOk = $response['result']['details'][$paramName]['ok'] ?? true;
    
                    $data = [
                        'data' => [
                            'status' => $isOk ? 'ok' : 'error',
                            'message' => $isOk ? 'Domain is active!' : 'Domain issues detected!',
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
                        ]
                    ];
                }
            } catch (\Throwable $e) {
                Craft::$app->getSession()->setError('Error fetching domain check data: ' . $e->getMessage());
                $data = [
                    'data' => [
                        'status' => 'error',
                        'error' => $e->getMessage(),
                        'url' => $url,
                    ]
                ];
            }
        }

        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_DOMAIN_CHECK, $isAjax);

        if ($isAjax) {
            return $this->asJson($data);
        }

        return $this->service->sendResponse($data, Constants::SUBNAV_ITEM_DOMAIN_CHECK['template']);
    }
    
    public function actionLighthouse(): Response
    {
        $url = Upsnap::getMonitoringUrl();
        
        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_LIGHTHOUSE);
        }
        $isAjax = Craft::$app->getRequest()->getIsAjax();

        $data = [];
        if ($isAjax) {
            try {
                $paramName = Constants::SUBNAV_ITEM_LIGHTHOUSE['apiLabel'];
    
                $response = $this->service->getHealthcheck($url, [$paramName], Craft::$app->getRequest()->getParam('device', 'desktop'));
    
                if (isset($response['result']['details'][$paramName]['error'])) {
                    Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details'][$paramName]['error']);
                    throw new \Exception($response['result']['details'][$paramName]['error']);
                }
    
                $isOk = $response['result']['details'][$paramName]['ok'] ?? true;
    
                if (isset($response['result'])) {
                    $result = $response['result'];
                    $lh = $result['details']['lighthouse'] ?? [];
    
                    $data = [
                        'data' => [
                            'status' => $isOk ? 'ok' : 'error',
                            'message' => $isOk ? 'All checks completed' : 'Some issues detected',
                            'url' => $response['url'] ?? '',
                            'checkedAt' => $response['checkedAt'] ?? '',
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
                        ]
                    ];
                }
            } catch (\Throwable $e) {
                Craft::$app->getSession()->setError('Error fetching lighthouse scores: ' . $e->getMessage());
                $data = [
                    'data' => [
                        'status' => 'error',
                        'error' => $e->getMessage(),
                        'url' => $url,
                    ]
                ];
            }
        }

        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_LIGHTHOUSE, $isAjax);
        if ($isAjax) {
            return $this->asJson($data);
        }

        return $this->service->sendResponse($data, Constants::SUBNAV_ITEM_LIGHTHOUSE['template']);
    }

    public function actionMixedContent(): Response
    {
        $url = Upsnap::getMonitoringUrl();

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_LIGHTHOUSE);
        }

        $data = [];

        try {
            $paramName = Constants::SUBNAV_ITEM_MIXED_CONTENT['apiLabel'];
            $response = $this->service->getHealthcheck($url, [$paramName]);

            if (isset($response['result']['details'][$paramName]['error'])) {
                $errorMsg = $response['result']['details'][$paramName]['error'];
                Craft::$app->getSession()->setError('Something went wrong: ' . $errorMsg);
                throw new \Exception($errorMsg);
            }

            // Transform API response to our expected format
            if (isset($response['result'])) {
                $result = $response['result'];
                $mixedContent = $result['details'][$paramName] ?? null;
                $meta = $mixedContent['meta'] ?? [];
                $isOk = $response['result']['details'][$paramName]['ok'] ?? true;

                $data = [
                    'data' => [
                        'status' => $isOk ? 'ok' : 'error',
                        'message' => $isOk ? 'No mixed content found!' : 'Mixed content detected!',
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',
                        'details' => [
                            'mixedCount' => $meta['mixedCount'] ?? 0,
                            'mixedContentItems' => $meta['mixedContentItems'] ?? [],
                        ]
                    ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching mixed content check data: ' . $e->getMessage());
            $data = [
                'data' => [
                    'status' => 'error',
                    'error' => $e->getMessage(),
                    'url' => $url,
                ]
            ];
        }

        $isAjax = Craft::$app->getRequest()->getIsAjax();
        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_MIXED_CONTENT, $isAjax);
        if ($isAjax) {
            return $this->asJson($data);
        }

        return $this->service->sendResponse($data, Constants::SUBNAV_ITEM_MIXED_CONTENT['template']);
    }

    public function actionReachability(): Response
    {
        $data = [];
        $url = Upsnap::getMonitoringUrl();

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_REACHABILITY);
        }

        try {
            $paramName = Constants::SUBNAV_ITEM_REACHABILITY['apiLabel'];
            $response = $this->service->getHealthcheck($url, [$paramName]);

            if (isset($response['result']['details'][$paramName]['error'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details'][$paramName]['error']);
                throw new \Exception($response['result']['details'][$paramName]['error']);
            }

            // Transform API response to our expected format
            if (isset($response['result'])) {
                $result = $response['result'];
                $uptime = $result['details'][$paramName] ?? null;
                $meta = $uptime['meta'] ?? [];
                $isOk = $response['result']['details'][$paramName]['ok'] ?? true;

                $data = [
                    'data' => [
                        'status' => $isOk ? 'ok' : 'error',
                        'message' => $isOk ? 'Website is reachable' : 'Website reachability issues detected!',
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

        $isAjax = Craft::$app->getRequest()->getIsAjax();
        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_REACHABILITY, $isAjax);

        if ($isAjax) {
            return $this->asJson($data);
        }
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
            $paramName = Constants::SUBNAV_ITEM_SECURITY_CERTIFICATES['apiLabel'];
            $response = $this->service->getHealthcheck($url, [$paramName]);

            if (isset($response['result']['details'][$paramName]['error'])) {
                Craft::$app->getSession()->setError('Something went wrong: ' . $response['result']['details'][$paramName]['error']);
                throw new \Exception($response['result']['details'][$paramName]['error']);
            }

            // Transform API response to our expected format for SSL certificate
            if (isset($response['result'])) {
                $result = $response['result'];
                $ssl = $result['details'][$paramName] ?? null;
                $meta = $ssl['meta'] ?? [];
                $isOk = $response['result']['details'][$paramName]['ok'] ?? true;

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
                        'status' => $isOk ? 'ok' : 'error',
                        'message' => $isOk ? 'Website SSL checks are valid' : 'Website SSL issues detected!',
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

        $isAjax = Craft::$app->getRequest()->getIsAjax();
        $data = $this->service->prepareData($data, Constants::SUBNAV_ITEM_SECURITY_CERTIFICATES, $isAjax);

        if ($isAjax) {
            return $this->asJson($data);
        }

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
