<?php

namespace appfoster\upsnap\controllers;

use Craft;
use yii\web\Response;

use appfoster\upsnap\Upsnap;
use appfoster\upsnap\assetbundles\MixedContentAsset;

class MixedContentController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        MixedContentAsset::register($this->view);
    }

    public function actionIndex(): Response
    {
        $data = [];

        try {
            $response = Upsnap::$plugin->apiService->post('healthcheck', [
                'url' => Upsnap::$healthCheckUrl,
                'checks' => ['mixed_content'],
            ]);
            if (isset($response['result']['details']['mixed_content']['error'])) {
                // Craft::$app->getSession()->setError('Something went wrong: ' . implode(', ', $response['result']['details']['mixed_content']['error']));
                return $this->renderTemplate('upsnap/mixed-content/_index', [
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

        return $this->renderTemplate('upsnap/mixed-content/_index', [
            'data' => $data,
            'title' => Craft::t('upsnap', 'Mixed Content Check'),
            'selectedSubnavItem' => 'mixed-content',
        ]);
    }
}
