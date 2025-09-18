<?php

namespace appfoster\sitemonitor\controllers;

use Craft;
use appfoster\sitemonitor\SiteMonitor;

class SettingsController extends BaseController
{
    /**
     * Show settings page
     */
    public function actionIndex(): \yii\web\Response
    {        
        $plugin = SiteMonitor::getInstance();
        $settings = $plugin->getSettings();

        $variables = [
            'settings' => $settings,
            'plugin' => $plugin,
            'title' => \Craft::t('site-monitor', 'Settings'),
            'selectedSubnavItem' => 'settings',
        ];

        return $this->renderTemplate('site-monitor/settings/_index', $variables);
    }

    /**
     * Save settings
     */
    public function actionSave()
    {
        $this->requirePostRequest();

        $settings = Craft::$app->getRequest()->getBodyParams();
        $plugin = SiteMonitor::getInstance();

        if (!$plugin->setSettings($settings)) {
            Craft::$app->getSession()->setError(Craft::t('site-monitor', 'Could not save settings.'));

            // Send the settings back to the template
            Craft::$app->getUrlManager()->setRouteParams([
                'settings' => $settings
            ]);

            return null;
        }

        Craft::$app->getSession()->setNotice(Craft::t('site-monitor', 'Settings saved.'));

        return $this->redirectToPostedUrl();
    }
}