<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\Upsnap;
use Craft;
use yii\web\Response;

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
            $response = Upsnap::$plugin->apiService->post('healthcheck', [
                'url' => Upsnap::$healthCheckUrl,
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
                    'plugin' => Upsnap::$plugin,
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

        return $this->renderTemplate('upsnap/broken-links/_index', [
            'data' => $data,
            'plugin' => Upsnap::$plugin,
            'title' => Craft::t('upsnap', 'Broken Links'),
            'selectedSubnavItem' => 'broken-links',
        ]);
    }
}
