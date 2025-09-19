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

    /**
     * Reachability index (status endpoint for Vue)
     */
    public function actionIndex(): Response
    {
        $apiService = SiteMonitor::$plugin->apiService;
        $currentStatus = ['status' => 'Unknown'];

        try {
            $currentStatus = $apiService->get('/uptime/status', [
                'site' => Craft::$app->getSites()->getCurrentSite()->baseUrl,
            ]);
        } catch (\Throwable $e) {
            Craft::error('Error fetching uptime status: ' . $e->getMessage(), __METHOD__);
        }

        return $this->asJson([
            'success' => true,
            'data' => $currentStatus ?? ['status' => 'Unknown'],
        ]);
    }

    /**
     * Reachability history (JSON endpoint for Vue)
     */
    public function actionHistory(): Response
    {
        $siteUrl = Craft::$app->getSites()->getCurrentSite()->baseUrl;
        $request = Craft::$app->getRequest();

        // Get params from body (JSON) or query
        $startDate = $request->getBodyParam('start_date') ?? $request->getParam('start_date');
        $endDate   = $request->getBodyParam('end_date') ?? $request->getParam('end_date');

        // Default: last 15 days
        if (!$startDate || !$endDate) {
            $endDate = (new DateTime('now'))->format('Y-m-d H:i:s');
            $startDate = (new DateTime('-15 days'))->format('Y-m-d H:i:s');
        }

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

        return $this->asJson([
            'success' => true,
            'data' => $history ?? [],
        ]);
    }
}
