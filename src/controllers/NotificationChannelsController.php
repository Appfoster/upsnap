<?php
 
namespace appfoster\upsnap\controllers;
 
use appfoster\upsnap\assetbundles\NotificationChannelsAsset;
use appfoster\upsnap\Constants;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use Symfony\Component\HttpFoundation\Response;
use appfoster\upsnap\Upsnap;
 
class NotificationChannelsController extends BaseController
{
 
    public function __construct()
    {
        parent::__construct();
        app(InternalAssetRegistry::class)->register(NotificationChannelsAsset::class);
    }
 
    /**
     * Render the notification channels listing page.
     * GET upsnap/notification-channels
     */
    public function index(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $settingsService->validateApiKey();
 
        $userDetails = null;
        if ($settingsService->getApiKey()) {
            $userDetails = $settingsService->getUserDetails();
        }
 
        $variables = [
            'title' => Constants::SUBNAV_ITEM_NOTIFICATION_CHANNELS['label'],
            'selectedSubnavItem' => Constants::SUBNAV_ITEM_NOTIFICATION_CHANNELS['key'],
            'apiKey' => $settingsService->getApiKey(),
            'apiTokenStatus' => $settingsService->getApiTokenStatus(),
            'apiTokenStatuses' => Constants::API_KEY_STATUS,
            'upsnapDashboardUrl' => Constants::getWebAppUrl('webapp'),
            'userDetails' => $userDetails,
            'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
            'settings' => [
                'monitoringUrl' => $settingsService->getMonitoringUrl(),
            ],
        ];
 
        return $this->renderTemplate('upsnap/notification-channels/_index', $variables);
    }
}
