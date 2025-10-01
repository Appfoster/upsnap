<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\DashboardAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;
use appfoster\upsnap\Upsnap;

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
        $variables = [
            'success' => true,
            'title' => Constants::SUBNAV_ITEM_DASHBOARD['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_DASHBOARD['key'],
        ];
        
        if (!$url) {
            $variables['success'] = false;
            $variables['message'] = 'Monitoring URL is not set. Please configure it in the settings.';
        }

        return $this->renderTemplate('upsnap/_index', $variables);
    }
}