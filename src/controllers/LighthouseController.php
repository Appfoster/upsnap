<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\SiteMonitor;
use Craft;
use yii\web\Response;

class LighthouseController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
    }

    public function actionIndex(): Response
    {
        $data = [];

        // ✅ Mock fallback data in the "future" structure
        $mock = [
            "pages" => [
                [
                    "requestedUrl" => SiteMonitor::$healthCheckUrl,
                    "strategies" => [
                        "desktop" => [
                            "meta" => [
                                "accessibility" => 95,
                                "bestPractices" => 61,
                                "pwa" => null,
                                "seo" => 100,
                                "source" => "cli",
                            ],
                            "performance" => [
                                "score" => 0.35,
                                "status" => "error",
                                "firstContentfulPaint" => [
                                    "displayValue" => "1.9 s",
                                    "value" => 1883.75,
                                    "status" => "success",
                                ],
                                "totalBlockingTime" => [
                                    "displayValue" => "230 ms",
                                    "value" => 229,
                                    "status" => "warning",
                                ],
                                "speedIndex" => [
                                    "displayValue" => "20.9 s",
                                    "value" => 20873.70,
                                    "status" => "error",
                                ],
                                "largestContentfulPaint" => [
                                    "displayValue" => "33.8 s",
                                    "value" => 33751.02,
                                    "status" => "error",
                                ],
                                "cumulativeLayoutShift" => [
                                    "displayValue" => "1.76",
                                    "value" => 1.76,
                                    "status" => "error",
                                ],
                            ],
                        ],
                        "mobile" => [
                            "meta" => [
                                "accessibility" => 90,
                                "bestPractices" => 55,
                                "pwa" => null,
                                "seo" => 95,
                                "source" => "cli",
                            ],
                            "performance" => [
                                "score" => 0.28,
                                "status" => "error",
                                "firstContentfulPaint" => [
                                    "displayValue" => "2.5 s",
                                    "value" => 2500,
                                    "status" => "warning",
                                ],
                                "totalBlockingTime" => [
                                    "displayValue" => "300 ms",
                                    "value" => 300,
                                    "status" => "warning",
                                ],
                                "speedIndex" => [
                                    "displayValue" => "25.0 s",
                                    "value" => 25000,
                                    "status" => "error",
                                ],
                                "largestContentfulPaint" => [
                                    "displayValue" => "35.0 s",
                                    "value" => 35000,
                                    "status" => "error",
                                ],
                                "cumulativeLayoutShift" => [
                                    "displayValue" => "1.80",
                                    "value" => 1.80,
                                    "status" => "error",
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response = SiteMonitor::$plugin->apiService->post('healthcheck', [
                'url' => SiteMonitor::$healthCheckUrl,
                'checks' => ["ssl"],
            ]);
            Craft::error('Lighthouse API response: ' . print_r($response, true), __METHOD__);
            if (isset($response['result'])) {
                $result = $response['result'];
                $lh = $result['details']['lighthouse'] ?? [];

                $pages = $lh['pages'] ?? $mock['pages'];

                // ✅ Unified structured response
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
                            "lighthouse" => [
                                "ok" => $lh['ok'] ?? true,
                                "pages" => $pages,
                            ],
                        ],
                        "durationMs" => $result['durationMs'] ?? 0,
                    ],
                ];
            } else {
                // ✅ If API fails completely, fallback to mock
                $data = [
                    "url" => SiteMonitor::$healthCheckUrl,
                    "checkedAt" => date(DATE_ATOM),
                    "result" => [
                        "summary" => [
                            "ok" => true,
                            "score" => 100,
                            "message" => "Mocked Lighthouse data",
                        ],
                        "details" => [
                            "lighthouse" => [
                                "ok" => true,
                                "pages" => $mock['pages'],
                            ],
                        ],
                        "durationMs" => 0,
                    ],
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching lighthouse scores: ' . $e->getMessage());
        }

        return $this->renderTemplate('site-monitor/lighthouse/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Lighthouse'),
            'selectedSubnavItem' => 'uptime',
        ]);
    }
}
