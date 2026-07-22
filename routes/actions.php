<?php

use Illuminate\Support\Facades\Route;
use appfoster\upsnap\controllers\SettingsController;
use appfoster\upsnap\controllers\MonitorsController;
use appfoster\upsnap\controllers\StatusPageController;
use appfoster\upsnap\controllers\NavBadgeController;
use appfoster\upsnap\controllers\AlertsController;
use appfoster\upsnap\controllers\IncidentsController;
use appfoster\upsnap\controllers\MonitorNotificationChannelsController;
use appfoster\upsnap\controllers\NotificationChannelsController;
use appfoster\upsnap\controllers\TagsController;
use appfoster\upsnap\controllers\RegionsController;
use appfoster\upsnap\controllers\DashboardController;
use appfoster\upsnap\controllers\HealthCheckController;

// Note: These routes are automatically prefixed with the plugin handle ("upsnap/")
// by Craft 6's HasRoutes trait, so do NOT add an "upsnap/" prefix here.
//
// JS calls like Craft.getActionUrl("upsnap/settings/login") resolve to
// admin/actions/upsnap/settings/login, which maps to these routes.

Route::middleware([\CraftCms\Cms\Http\Middleware\RequireAdmin::class])->group(function () {
    // Dashboard actions
    Route::post('dashboard/monitor-context', [DashboardController::class, 'monitorContext']);

    // Settings actions
    Route::post('settings/save', [SettingsController::class, 'save']);
    Route::post('settings/set-primary-monitor', [SettingsController::class, 'setPrimaryMonitor']);
    Route::post('settings/login', [SettingsController::class, 'login']);
    Route::post('settings/register', [SettingsController::class, 'register']);
    Route::post('settings/create-api-token', [SettingsController::class, 'createApiToken']);
    Route::post('settings/create-first-monitor', [SettingsController::class, 'createFirstMonitor']);
    Route::post('settings/bulk-create-monitors', [SettingsController::class, 'bulkCreateMonitors']);

    // Monitors actions
    Route::match(['get', 'post'], 'monitors/list', [MonitorsController::class, 'list']);
    Route::post('monitors/update', [MonitorsController::class, 'update']);
    Route::get('monitors/histogram/{monitorId}', [MonitorsController::class, 'histogramData']);
    Route::get('monitors/response-time/{monitorId}', [MonitorsController::class, 'responseTimeData']);
    Route::get('monitors/uptime-stats/{monitorId}', [MonitorsController::class, 'uptimeStatsData']);
    Route::get('monitors/uptime-stats', [MonitorsController::class, 'uptimeStats']);
    Route::get('monitors/widget-status', [MonitorsController::class, 'widgetStatus']);

    // Status Page actions
    Route::match(['get', 'post'], 'status-page/list', [StatusPageController::class, 'list']);
    Route::post('status-page/save', [StatusPageController::class, 'save']);
    Route::post('status-page/delete', [StatusPageController::class, 'delete']);
    Route::post('status-page/reset-shareable-id', [StatusPageController::class, 'resetShareableId']);
    Route::post('status-page/upload', [StatusPageController::class, 'upload']);
    Route::post('status-page/announcements-list', [StatusPageController::class, 'announcementsList']);
    Route::post('status-page/announcement-detail', [StatusPageController::class, 'announcementDetail']);
    Route::post('status-page/announcement-save', [StatusPageController::class, 'announcementSave']);
    Route::post('status-page/announcement-delete', [StatusPageController::class, 'announcementDelete']);

    // NavBadge
    Route::get('nav-badge/status', [NavBadgeController::class, 'status']);

    // Alerts
    Route::post('alerts/dismiss', [AlertsController::class, 'dismiss']);

    // Incidents (data endpoints)
    Route::get('incidents/list', [IncidentsController::class, 'list']);
    Route::get('incidents/export', [IncidentsController::class, 'export']);
    Route::get('incidents/detail', [IncidentsController::class, 'detail']);
    Route::get('incidents/incident-stats', [IncidentsController::class, 'incidentStats']);

    // Regions
    Route::get('regions/list', [RegionsController::class, 'list']);

    // Monitors additional actions
    Route::post('monitors/delete', [MonitorsController::class, 'delete']);
    Route::post('monitors/bulk-actions', [MonitorsController::class, 'bulkActions']);
    Route::get('monitors/get-settings', [MonitorsController::class, 'getSettings']);
    Route::post('monitors/save', [MonitorsController::class, 'save']);

    // Tags actions
    Route::get('tags/list', [TagsController::class, 'list']);
    Route::post('tags/create', [TagsController::class, 'create']);

    // Monitor Notification Channels actions
    Route::get('monitor-notification-channels/list-supported-types', [MonitorNotificationChannelsController::class, 'listSupportedTypes']);
    Route::post('monitor-notification-channels/create', [MonitorNotificationChannelsController::class, 'create']);
    Route::post('monitor-notification-channels/update', [MonitorNotificationChannelsController::class, 'update']);
    Route::match(['get', 'post'], 'monitor-notification-channels/list', [MonitorNotificationChannelsController::class, 'list']);
    Route::post('monitor-notification-channels/delete', [MonitorNotificationChannelsController::class, 'delete']);
    Route::post('monitor-notification-channels/test', [MonitorNotificationChannelsController::class, 'test']);

    // Health Check actions
    Route::post('health-check/broken-links', [HealthCheckController::class, 'brokenLinks']);
    Route::post('health-check/domain-check', [HealthCheckController::class, 'domainCheck']);
    Route::post('health-check/lighthouse', [HealthCheckController::class, 'lighthouse']);
    Route::post('health-check/mixed-content', [HealthCheckController::class, 'mixedContent']);
    Route::post('health-check/reachability', [HealthCheckController::class, 'reachability']);
    Route::post('health-check/security-certificates', [HealthCheckController::class, 'securityCertificates']);
});

