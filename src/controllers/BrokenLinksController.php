<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\SiteMonitor;
use Craft;
use yii\web\Response;
use DateTime;

class BrokenLinksController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
    }

    public function actionIndex(): Response
    {
        $data = [];

        try {
            // TODO: replace this mock with the real API call once available.
            // Example real call (when ready):
            $response = SiteMonitor::$plugin->apiService->post('healthcheck', [
                'url' => SiteMonitor::$healthCheckUrl,
                'checks' => ['broken_links'],
            ]);

            $mockData = [
                "success" => true,
                "data" => [
                    "update" => ["time" => 1758472884, "offset" => 160153],
                    "status" => [
                        "pages" => [
                            [
                                "page" => "https://prisha-ecoforge.appfoster.site/",
                                "items" => [
                                    [
                                        "page" => "https://prisha-ecoforge.appfoster.site/",
                                        "href" => "undefined",
                                        "url" => "https://prisha-ecoforge.appfoster.site/undefined",
                                        "name" => null,
                                        "info" => "",
                                        "result" => "404 Not Found",
                                        "classification" => "major",
                                        "external" => false,
                                        "resolved" => false,
                                        "ref_url" => "https://prisha-ecoforge.appfoster.site/undefined",
                                        "rid" => null,
                                        "title" => "Resource not found (HTTP 404)",
                                        "culprit" => "It seems like this page does not exist."
                                    ]
                                ]
                            ]
                        ],
                        "run_info" => "",
                        "redirected" => 0,
                        "blocked" => 0,
                        "nr_pages_checked" => 8,
                        "resolved_results" => []
                    ],
                    "server_status" => "error",
                    "serverid" => 18835,
                    "server" => [
                        "id" => 18835,
                        "name" => "prisha-ecoforge.appfoster.site",
                        "verify_ssl" => 1,
                        "status" => "warning",
                        "last_test" => 1758472884,
                        "number_of_errors" => 1,
                        "brokenlink_exclusions" => "[]",
                        "total_detected_links" => 91,
                        "total_test_time" => 32,
                        "crawler_speed" => 0,
                        "url" => "https://prisha-ecoforge.appfoster.site/"
                    ]
                ],
                "time" => 1758633037,
                "server" => "api02"
            ];

            $serverStatus = $mockData['data']['server_status'] ?? 'ok';
            $statusData = $mockData['data']['status'] ?? [];
            $server = $mockData['data']['server'] ?? [];

            // Build normalized broken links array safely
            $brokenLinks = [];
            $pages = $statusData['pages'] ?? [];
            foreach ($pages as $page) {
                $pageUrl = $page['page'] ?? '';
                $items = $page['items'] ?? [];
                foreach ($items as $item) {
                    // prefer item url or href
                    $targetUrl = $item['url'] ?? $item['href'] ?? '';
                    // anchor text: name or title or empty
                    $anchorText = $item['name'] ?? $item['title'] ?? '';

                    // Use item-level timestamp if available, otherwise server last_test, otherwise update.time, otherwise empty
                    $detectedTimestamp = null;
                    if (!empty($item['detected_at'])) {
                        $detectedTimestamp = $item['detected_at'];
                    } elseif (!empty($server['last_test'])) {
                        $detectedTimestamp = $server['last_test'];
                    } elseif (!empty($response['data']['update']['time'])) {
                        $detectedTimestamp = $response['data']['update']['time'];
                    }

                    $detectedAt = $detectedTimestamp ? date('d M Y H:i:s', (int)$detectedTimestamp) : '';

                    $brokenLinks[] = [
                        'url' => $targetUrl,
                        'brokenUrl' => $targetUrl, // legacy name — keep both for templates
                        'pageUrl' => $pageUrl,
                        'statusCode' => $item['result'] ?? '',
                        // lowercase so it matches filter values in twig (internal/external)
                        'type' => !empty($item['external']) ? 'external' : 'internal',
                        'anchorText' => $anchorText,
                        'detectedAt' => $detectedAt,
                        'title' => $item['title'] ?? '',
                        'culprit' => $item['culprit'] ?? '',
                        'resolved' => !empty($item['resolved']),
                        'classification' => $item['classification'] ?? '',
                        'refUrl' => $item['ref_url'] ?? '',
                        'rid' => $item['rid'] ?? null,
                    ];
                }
            }

            // Build final data payload for Twig
            $data = [
                'status' => $serverStatus,
                'message' => $serverStatus === 'ok' ? 'All links are working fine' : 'Some broken links detected',
                'url' => $server['url'] ?? ($response['data']['server']['url'] ?? ''),
                'checkedAt' => !empty($server['last_test']) ? date('d M Y H:i:s', (int)$server['last_test']) : '',
                // top-level convenience key expected by some templates
                'brokenLinks' => $brokenLinks,
                'details' => [
                    'totalPagesChecked' => $statusData['nr_pages_checked'] ?? 0,
                    'totalLinksScanned' => $server['total_detected_links'] ?? 0,
                    'errorsCount' => $server['number_of_errors'] ?? 0,
                    'brokenLinks' => $result['details']['broken_links'] ?? $brokenLinks,
                ],
            ];
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching broken links data: ' . $e->getMessage());
            // keep $data at least defined so Twig doesn't error
            $data = [
                'status' => 'error',
                'message' => 'Error fetching broken links data',
                'brokenLinks' => [],
                'details' => [
                    'totalPagesChecked' => 0,
                    'totalLinksScanned' => 0,
                    'errorsCount' => 0,
                    'brokenLinks' => [],
                ],
            ];
        }

        return $this->renderTemplate('site-monitor/broken-links/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Broken Links'),
            'selectedSubnavItem' => 'uptime',
        ]);
    }
}
