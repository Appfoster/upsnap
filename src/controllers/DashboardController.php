<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\DashboardAsset;

class DashboardController extends BaseController
{
    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        DashboardAsset::register($this->view);
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
            'title' => \Craft::t('upsnap', 'Dashboard'),
            'selectedSubnavItem' => 'dashboard',
        ];

        return $this->renderTemplate('upsnap/_index', $variables);
    }
}