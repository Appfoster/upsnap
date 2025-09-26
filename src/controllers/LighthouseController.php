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
        try {
            $response = SiteMonitor::$plugin->apiService->post('healthcheck', [
                'url' => SiteMonitor::$healthCheckUrl,
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

        return $this->renderTemplate('site-monitor/lighthouse/_index', [
            'data' => $data,
            'plugin' => SiteMonitor::$plugin,
            'title' => Craft::t('site-monitor', 'Lighthouse'),
            'selectedSubnavItem' => 'lighthouse',
        ]);
    }
}
