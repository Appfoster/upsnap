<?php

namespace appfoster\sitemonitor\controllers;

use appfoster\sitemonitor\assetbundles\monitor\MonitorAsset;

class DashboardController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
    }

    // Action Methods
    // =========================================================================

    /**
     * Dashboard index
     */
    public function actionIndex(): \yii\web\Response
    {
        $plugin = \appfoster\sitemonitor\SiteMonitor::getInstance();
        $settings = $plugin->getSettings();

        $variables = [
            'settings' => $settings,
            'plugin' => $plugin,
            'title' => \Craft::t('site-monitor', 'Dashboard'),
            'selectedSubnavItem' => 'dashboard',
        ];

        // Register asset bundle
        MonitorAsset::register($this->view);

        return $this->renderTemplate('site-monitor/_index', $variables);
    }
}