<?php
 
namespace appfoster\upsnap\controllers;
 
use Symfony\Component\HttpFoundation\Response;
 
class AlertsController extends BaseController
{
    /**
     * POST upsnap/alerts/dismiss
     *
     * Stores the dismissed alert hash in the Craft session so the banner is
     * suppressed for the rest of this browser session. If new unresolved alerts
     * arrive (different hash), the banner reappears automatically.
     */
    public function dismiss(): Response
    {
        $hash = request()->input('hash');
        abort_unless($hash, 400, 'Missing hash');
 
        session()->put('upsnapExpiryAlertDismissedHash', $hash);
 
        return $this->asJson(['success' => true]);
    }
}
