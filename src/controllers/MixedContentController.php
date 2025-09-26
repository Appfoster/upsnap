<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\SiteMonitor;
use Craft;
use yii\web\Response;
use DateTime;

class MixedContentController extends BaseController
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
                'checks' => ['mixed_content'],
            ]);
            if (isset($response['result']['details']['mixed_content']['error'])) {
                // Craft::$app->getSession()->setError('Something went wrong: ' . implode(', ', $response['result']['details']['mixed_content']['error']));
                return $this->renderTemplate('site-monitor/mixed-content/_index', [
                    'data' => [
                        'status' => 'error',
                        'error' => $response['result']['details']['mixed_content']['error'] ?? 'Unknown error',
                        'url' => $response['url'] ?? '',
                        'checkedAt' => $response['checkedAt'] ?? '',
                        'duration' => isset($response['result']['durationMs']) ? $response['result']['durationMs'] . ' ms' : '-',
                    ],
                    'plugin' => SiteMonitor::$plugin,
                    'title' => Craft::t('site-monitor', 'Mixed Content Check'),
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

        return $this->renderTemplate('site-monitor/mixed-content/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Mixed Content Check'),
            'selectedSubnavItem' => 'mixed-content',
        ]);
    }
}
