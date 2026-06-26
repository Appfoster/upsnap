<?php

namespace appfoster\upsnap\controllers;

use Craft;

class AlertsController extends BaseController
{
    /**
     * POST upsnap/alerts/dismiss
     *
     * Stores the dismissed alert hash in the Craft session so the banner is
     * suppressed for the rest of this browser session. If new unresolved alerts
     * arrive (different hash), the banner reappears automatically.
     */
    public function actionDismiss(): \yii\web\Response
    {
        $this->requirePostRequest();

        $hash = Craft::$app->getRequest()->getRequiredBodyParam('hash');

        Craft::$app->getSession()->set('upsnapExpiryAlertDismissedHash', $hash);

        return $this->asJson(['success' => true]);
    }
}
