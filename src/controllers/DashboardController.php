<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\DashboardAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;
use appfoster\upsnap\Upsnap;
use Craft;

class DashboardController extends BaseController
{
    public $service;
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        DashboardAsset::register($this->view);
        $this->service = new HealthCheckService($this);
    }

    // Action Methods
    // =========================================================================

    /**
     * Dashboard index
     */
    public function actionIndex(): \yii\web\Response
    {
        $url = Upsnap::getMonitoringUrl();
        $settingsService = Upsnap::$plugin->settingsService;

        $monitorId = $settingsService->getMonitorId();
        $monitorData = null; // default

        // Try to fetch monitor data only if monitorId exists
        if ($monitorId) {
            try {
                $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'] . '/' . $monitorId;
                $response = Upsnap::$plugin->apiService->get($endpoint);

                if (isset($response['status']) && $response['status'] === 'success') {
                    $monitorData = $response['data']['monitor'] ?? null;
                } else {
                    Craft::error("Monitor fetch failed: invalid response", __METHOD__);
                }
            } catch (\Throwable $e) {
                Craft::error("Monitor fetch failed: {$e->getMessage()}", __METHOD__);
            }
        }

        $variables = [
            'success' => true,
            'title' => Constants::SUBNAV_ITEM_DASHBOARD['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_DASHBOARD['key'],
            'url' => $url,
            'monitorId' => $monitorId,
            'monitorData' => $monitorData,
        ];

        if (!$url) {
            $variables['success'] = false;
            $variables['message'] = 'Monitoring URL is not set. Please configure it in the settings.';
        }

        return $this->renderTemplate('upsnap/_index', $variables);
    }
}