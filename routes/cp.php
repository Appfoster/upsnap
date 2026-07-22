<?php

use Illuminate\Support\Facades\Route;
use appfoster\upsnap\controllers\DashboardController;
use appfoster\upsnap\controllers\SettingsController;
use appfoster\upsnap\controllers\HealthCheckController;
use appfoster\upsnap\controllers\MonitorsController;
use appfoster\upsnap\controllers\NotificationChannelsController;
use appfoster\upsnap\controllers\IncidentsController;
use appfoster\upsnap\controllers\StatusPageController;

// CP page routes — these render full Control Panel pages.
// POST/data endpoints are in routes/actions.php instead.
Route::middleware([\CraftCms\Cms\Http\Middleware\RequireAdmin::class])->group(function () {
    Route::prefix('upsnap')->group(function () {
        // Dashboard
        Route::get('/', [DashboardController::class, 'index']);

        // Health Checks
        Route::get('reachability', [HealthCheckController::class, 'reachability']);
        Route::get('reachability/history', [HealthCheckController::class, 'history']);
        Route::get('security-certificates', [HealthCheckController::class, 'securityCertificates']);
        Route::get('broken-links', [HealthCheckController::class, 'brokenLinks']);
        Route::get('lighthouse', [HealthCheckController::class, 'lighthouse']);
        Route::get('domain-check', [HealthCheckController::class, 'domainCheck']);
        Route::get('mixed-content', [HealthCheckController::class, 'mixedContent']);

        // Status Page
        Route::get('status-page', [StatusPageController::class, 'index']);
        Route::get('status-page/new', [StatusPageController::class, 'new']);
        Route::get('status-page/edit/{statusPageId}', [StatusPageController::class, 'new']);

        // Monitors
        Route::get('monitors', [MonitorsController::class, 'index']);
        Route::get('monitors/new', [MonitorsController::class, 'new']);
        Route::get('monitors/edit/{monitorId}', [MonitorsController::class, 'edit']);
        Route::get('monitors/detail/{monitorId}', [MonitorsController::class, 'detail']);

        // Notification Channels
        Route::get('notification-channels', [NotificationChannelsController::class, 'index']);

        // Settings
        Route::get('settings', [SettingsController::class, 'index']);
        Route::get('settings/multisite-setup', [SettingsController::class, 'multiSiteSetup']);

        // Incidents
        Route::get('incidents', [IncidentsController::class, 'index']);
        Route::get('incidents/{incidentId}', [IncidentsController::class, 'view']);
    });
});
