<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\monitor\MonitorAsset;

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
        $plugin = \appfoster\upsnap\Upsnap::getInstance();
        $settings = $plugin->getSettings();

        $variables = [
            'settings' => $settings,
            'plugin' => $plugin,
            'title' => \Craft::t('upsnap', 'Dashboard'),
            'selectedSubnavItem' => 'dashboard',
        ];

        // Register asset bundle
        MonitorAsset::register($this->view);

        return $this->renderTemplate('upsnap/_index', $variables);
    }
}