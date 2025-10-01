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

        if (!$url) {
            return $this->service->handleMissingMonitoringUrl(Constants::SUBNAV_ITEM_DASHBOARD);
        }

        $plugin = \appfoster\upsnap\Upsnap::getInstance();
        $settings = $plugin->getSettings();

        $variables = [
            'settings' => $settings,
            'title' => \Craft::t('upsnap', 'Dashboard'),
            'selectedSubnavItem' => 'dashboard',
        ];

        return $this->renderTemplate('upsnap/_index', $variables);
    }
}