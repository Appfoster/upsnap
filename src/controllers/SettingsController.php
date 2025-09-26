<?php

namespace appfoster\upsnap\controllers;

use Craft;
use appfoster\upsnap\Upsnap;

class SettingsController extends BaseController
{
    /**
     * Show settings page
     */
    public function actionIndex(): \yii\web\Response
    {        
        $plugin = Upsnap::getInstance();
        $settings = $plugin->getSettings();

        $variables = [
            'settings' => $settings,
            'plugin' => $plugin,
            'title' => \Craft::t('upsnap', 'Settings'),
            'selectedSubnavItem' => 'settings',
        ];

        return $this->renderTemplate('upsnap/settings/_index', $variables);
    }

    /**
     * Save settings
     */
    public function actionSave()
    {
        $this->requirePostRequest();

        $settings = Craft::$app->getRequest()->getBodyParams();
        $plugin = Upsnap::getInstance();

        if (!$plugin->setSettings($settings)) {
            Craft::$app->getSession()->setError(Craft::t('upsnap', 'Could not save settings.'));

            // Send the settings back to the template
            Craft::$app->getUrlManager()->setRouteParams([
                'settings' => $settings
            ]);

            return null;
        }

        Craft::$app->getSession()->setNotice(Craft::t('upsnap', 'Settings saved.'));

        return $this->redirectToPostedUrl();
    }
}