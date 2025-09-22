<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\SiteMonitor;
use Craft;
use yii\web\Response;
use DateTime;

class ReachabilityController extends BaseController
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
                "checks" => ["uptime"],
            ]);

            // Transform API response to our expected format
            if (isset($response['result'])) {
                $result = $response['result'];
                $uptime = $result['details']['uptime'] ?? null;
                $meta = $uptime['meta'] ?? [];

                $data = [
                    'status' => $result['summary']['ok'] ? 'ok' : 'error',
                    'message' => $result['summary']['message'] ?? 'Status check completed',
                    'url' => $response['url'] ?? '',
                    'checkedAt' => $response['checkedAt'] ?? '',
                    'details' => [
                        'duration' => isset($result['durationMs']) ? $result['durationMs'] . ' ms' : 'Unknown',
                        'httpStatus' => $meta['statusCode'] ?? 0,
                        'finalURL' => $meta['finalURL'] ?? '',
                        'redirects' => $meta['redirects'] ?? null,
                        'resolvedIPs' => $meta['resolvedIPs'] ?? [],
                        'server' => $meta['server'] ?? '',
                        'contentType' => $meta['contentType'] ?? '',
                        'contentLength' => $meta['contentLength'] ?? 0,
                        'pageTitle' => $meta['title'] ?? '',
                        'tls' => $meta['tls'] ?? null,
                        'monitoredFrom' => [
                            'location' => $meta['location'] ?? '',
                            'ip' => $meta['ip'] ?? '',
                        ],
                    ]
                ];
            }
        } catch (\Throwable $e) {
            Craft::$app->getSession()->setError('Error fetching uptime status: ' . $e->getMessage());
        }

        return $this->renderTemplate('site-monitor/reachability/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Uptime'),
            'selectedSubnavItem' => 'uptime',
        ]);
    }


    /**
     * Reachability history (JSON endpoint for Vue)
     */
    public function actionHistory(): \yii\web\Response
    {
        Craft::error("HEIuhskjdjlaksda", __METHOD__);
        $siteUrl = Craft::$app->getSites()->getCurrentSite()->baseUrl;
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
            $history = SiteMonitor::$plugin->historyService->getHistory(
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
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Uptime History'),
            'selectedSubnavItem' => 'uptime',
        ];

        return $this->renderTemplate('site-monitor/reachability/history', $variables);
    }
}
