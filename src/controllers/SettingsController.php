<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\Upsnap;
use appfoster\upsnap\assetbundles\SettingsAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\services\HealthCheckService;
use appfoster\upsnap\assetbundles\MultisiteSetupAsset;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use CraftCms\Cms\Support\Url;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use function CraftCms\Cms\t;
use function CraftCms\Cms\currentUser;

class SettingsController extends BaseController
{
    private HealthCheckService $healthCheckService;

    public function __construct()
    {
        parent::__construct();
        app(InternalAssetRegistry::class)->register(SettingsAsset::class);
        $this->healthCheckService = new HealthCheckService($this);
    }

    /**
     * Show settings page
     */
    public function index(): Response
    {
        $plugin = Upsnap::getInstance();
        $service = $plugin->settingsService;
        $monitorId = $service->getMonitorId();


        // Create a settings model with current database values
        $settings = $service->getNewModel();
        $monitoringUrl = $service->getMonitoringUrl();
        $service->validateApiKey();
        $apiTokenStatus = $service->getApiTokenStatus();
        if (!$monitoringUrl) {
            // For fresh setup, use the primary site's base URL as default
            $monitoringUrl = $service->getSiteUrl();
        }
        if($apiTokenStatus != Constants::API_KEY_STATUS['active']) {
            $settings->monitoringUrl = $monitoringUrl;
        }
        $settings->monitorId = $monitorId;
        $apiKey = $service->getApiKey();
        $settings->apiKey = $service->maskApiKey($apiKey);
        $settings->monitoringInterval = $service->getMonitoringInterval();


        return $this->renderSettings($settings);
    }

    /**
     * Save settings
     */
    public function save(): Response
    {
        $body = request()->all();
        $plugin = Upsnap::getInstance();
        $service = $plugin->settingsService;

        $settings = $service->getNewModel();

        // Set default monitoring URL if not set
        if (!$settings->monitoringUrl) {
            $settings->monitoringUrl = $service->getSiteUrl();
        }

        // Only update fields that are actually in the request
        $this->updateIfExists($settings, $body, 'apiKey', 'trim');

        // Validate only updated fields
        if (!$settings->validate()) {
            $allErrors = collect($settings->errors()->getMessages())->flatten()->join("\n");
            session()->flash('error', $allErrors);
            return $this->renderSettings($settings);
        }

        // API key handling if updated
        if (array_key_exists('apiKey', $body) && $service->isApiKeyUpdated($settings->apiKey)) {
            try {
                if (!$service->verifyApiKey($settings->apiKey)) {
                    session()->flash('error', t('Invalid API Key.', [], 'upsnap'));
                    return $this->renderSettings($settings);
                }
                $service->setApiKey($settings->apiKey);
            } catch (\Throwable $e) {
                session()->flash('error', 'Error verifying API key: ' . $e->getMessage());
                return $this->renderSettings($settings);
            }
        }


        session()->flash('notice', t('Settings saved.', [], 'upsnap'));
        return $this->redirectToPostedUrl();
    }

    /**
     * Render the settings page with validation errors.
     */
    private function renderSettings($settings): Response
    {
        $service = Upsnap::getInstance()->settingsService;
        $service->validateApiKey();
        $userDetails = null;
        if ($service->getApiKey()) {
            $userDetails = $service->getUserDetails();
        }
        return $this->healthCheckService->sendResponse(
            [
                'settings' => $settings,
                'showHealthchecks' => $service->getApiKey() !== null,
                'upsnapDashboardUrl' => Constants::getWebAppUrl('webapp'),
                'title' => Constants::SUBNAV_ITEM_SETTINGS['label'],
                'selectedSubnavItem' => Constants::SUBNAV_ITEM_SETTINGS['key'],
                'apiTokenStatus' => $service->getApiTokenStatus(),
                'subscriptionTypes' => Constants::SUBSCRIPTION_TYPES,
                'apiTokenStatuses' => Constants::API_KEY_STATUS,
                'userDetails' => $userDetails,
                'intervalOptions' => $service->formatOptions(Constants::MONITOR_INTERVALS, true),
                'strategyOptions' => $service->formatOptions(Constants::LIGHTHOUSE_STRATEGIES),
                'expiryDayOptions' => $service->formatOptions(Constants::EXPIRY_DAYS),
            ],
            Constants::SUBNAV_ITEM_SETTINGS['template']
        );
    }

    /**
     * Updates a setting value if the key exists in the body.
     */
    private function updateIfExists($settings, array $body, string $key, ?string $type = null): void
    {
        if (!array_key_exists($key, $body)) {
            return;
        }

        $value = $body[$key];

        switch ($type) {
            case 'bool':
                $value = (bool)$value;
                break;
            case 'int':
                $value = (int)$value;
                break;
            case 'float':
                $value = (float)$value;
                break;
            case 'trim':
                $value = trim((string)$value);
                break;
            case 'json':
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    $value = $decoded ?? $value;
                }
        }

        $settings->$key = $value;
    }


    public function setPrimaryMonitor(): Response
    {
        $monitorId = request()->input('monitorId');
        $monitoringUrl = request()->input('monitoringUrl');

        if (!$monitorId) {
            return $this->asJson([
                'success' => false,
                'message' => 'Missing monitorId.'
            ]);
        }

        try {
            $service = Upsnap::getInstance()->settingsService;
            // Always save the monitor ID
            $service->setMonitorId($monitorId);

            // Only save the monitoring URL if it's provided (website monitors only)
            if ($monitoringUrl) {
                $service->setMonitoringUrl($monitoringUrl);
            }

            return $this->asJson([
                'success' => true,
                'message' => 'Primary monitor updated.',
                'data' => [
                    'monitorId' => $monitorId,
                    'monitoringUrl' => $monitoringUrl,
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->asJson([
                'success' => false,
                'message' => 'Error saving monitor: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Handle in-plugin user login
     * Returns JSON with success/error details.
     */
    public function login(): Response
    {
        $email    = trim(request()->input('email', ''));
        $password = request()->input('password', '');

        $errors = [];

        if ($email === '') {
            $errors['email'] = [t('Email is required.', [], 'upsnap')];
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = [t('Please enter a valid email address.', [], 'upsnap')];
        }

        if ($password === '') {
            $errors['password'] = [t('Password is required.', [], 'upsnap')];
        }

        if (!empty($errors)) {
            return $this->asJson(['success' => false, 'errors' => $errors]);
        }

        try {
            $settingsService = Upsnap::getInstance()->settingsService;
            $result = $settingsService->login($email, $password);

            if (($result['status'] ?? '') === 'success') {
                $shouldShowMultisite = false;
                if ($settingsService->getMonitorId() === null) {
                    try {
                        $sites = $settingsService->getAllCraftSites();
                        $sitesWithUrl = array_filter($sites, fn($s) => $s['hasUrl']);
                        $shouldShowMultisite = count($sitesWithUrl) > 1;
                    } catch (\Throwable $e) {
                        Log::warning('Could not check sites for multisite redirect on login: ' . $e->getMessage());
                    }
                }

                if ($shouldShowMultisite) {
                    return $this->asJson([
                        'success'                => true,
                        'message'                => t('Login successful!', [], 'upsnap'),
                        'requiresMultisiteSetup' => true,
                        'redirectUrl'            => Url::cpUrl(Constants::SUBNAV_ITEM_MULTISITE_SETUP['url']),
                        'primaryMonitorRequirement' => null,
                    ]);
                }

                $primaryMonitorRequirement = $settingsService->getPrimaryMonitorRequirement();

                return $this->asJson([
                    'success' => true,
                    'message' => t('Login successful!', [], 'upsnap'),
                    'redirectUrl' => Url::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']) . '#monitors-tab',
                    'primaryMonitorRequirement' => $primaryMonitorRequirement,
                ]);
            }

            return $this->asJson([
                'success' => false,
                'errors'  => ['general' => [$result['message'] ?? t('Login failed. Please check your credentials and try again.', [], 'upsnap')]],
            ]);
        } catch (\Throwable $e) {
            Log::error('Login failed: ' . $e->getMessage());
            return $this->asJson([
                'success' => false,
                'errors'  => ['general' => [t('An error occurred. Please try again.', [], 'upsnap')]],
            ]);
        }
    }

    /**
     * Signup Step 1: Create account and return session token.
     * Used by progress modal to start the 3-step signup flow.
     */
    public function register(): Response
    {
        $fullname  = trim(request()->input('fullname', ''));
        $email     = trim(request()->input('email', ''));
        $password  = request()->input('password', '');
        $confirm   = request()->input('confirm_password', '');

        $errors = [];

        if ($fullname === '') {
            $errors['fullname'] = [t('Full name is required.', [], 'upsnap')];
        }

        if ($email === '') {
            $errors['email'] = [t('Email is required.', [], 'upsnap')];
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = [t('Please enter a valid email address.', [], 'upsnap')];
        }

        if ($password === '') {
            $errors['password'] = [t('Password is required.', [], 'upsnap')];
        } elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password)) {
            $errors['password'] = [t('Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.', [], 'upsnap')];
        }

        if ($confirm === '') {
            $errors['confirm_password'] = [t('Confirm password is required.', [], 'upsnap')];
        } elseif ($confirm !== $password) {
            $errors['confirm_password'] = [t('Passwords do not match.', [], 'upsnap')];
        }

        if (!empty($errors)) {
            return $this->asJson(['success' => false, 'errors' => $errors]);
        }

        try {
            $result = Upsnap::getInstance()->settingsService->createUserAccountStep($email, $password, $fullname);
            return $this->asJson($result);
        } catch (\Throwable $e) {
            Log::error('Signup Step 1 failed: ' . $e->getMessage());
            return $this->asJson([
                'status'  => 'error',
                'message' => t('An error occurred. Please try again.', [], 'upsnap'),
            ]);
        }
    }

    /**
     * Signup Step 2: Fetch or create API token using session token.
     * Called after Step 1 completes.
     */
    public function createApiToken(): Response
    {
        $sessionToken  = trim(request()->input('session_token', ''));

        if (!$sessionToken) {
            return $this->asJson([
                'status'  => 'error',
                'message' => 'Session token is required.',
            ]);
        }

        try {
            $result = Upsnap::getInstance()->settingsService->getApiTokenStep($sessionToken);
            return $this->asJson($result);
        } catch (\Throwable $e) {
            Log::error('Signup Step 2 failed: ' . $e->getMessage());
            return $this->asJson([
                'status'  => 'error',
                'message' => t('An error occurred. Please try again.', [], 'upsnap'),
            ]);
        }
    }

    /**
     * Signup Step 3: Create first monitor.
     * If multiple Craft sites are detected, skips auto-creation and returns a multisite redirect instead.
     */
    public function createFirstMonitor(): Response
    {
        try {
            $settingsService = Upsnap::getInstance()->settingsService;
            $sites = $settingsService->getAllCraftSites();
            $sitesWithUrl = array_values(array_filter($sites, fn($s) => $s['hasUrl']));

            if (count($sitesWithUrl) > 1) {
                return $this->asJson([
                    'status' => 'success',
                    'data' => [
                        'multisite'   => true,
                        'siteCount'   => count($sitesWithUrl),
                        'redirectUrl' => Url::cpUrl(Constants::SUBNAV_ITEM_MULTISITE_SETUP['url']),
                        'message'     => t('Multiple Craft sites detected. Redirecting to multi-site setup.', [], 'upsnap'),
                    ],
                ]);
            }

            $result = $settingsService->createFirstMonitorStep();
            return $this->asJson($result);
        } catch (\Throwable $e) {
            Log::error('Signup Step 3 failed: ' . $e->getMessage());
            return $this->asJson([
                'status'  => 'error',
                'message' => t('An error occurred. Please try again.', [], 'upsnap'),
            ]);
        }
    }

    /**
     * Render the multi-site monitor setup screen.
     * GET upsnap/settings/multisite-setup
     */
    public function multiSiteSetup(): Response
    {
        $service = Upsnap::getInstance()->settingsService;

        if (!$service->getApiKey()) {
            return redirect()->to(
                Url::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']) . '#register-signin-tab'
            );
        }

        $service->validateApiKey();

        if ($service->getApiTokenStatus() !== Constants::API_KEY_STATUS['active']) {
            session()->flash('error', t('Please configure a valid API key before setting up monitors.', [], 'upsnap'));
            return redirect()->to(Url::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']));
        }

        app(InternalAssetRegistry::class)->register(MultisiteSetupAsset::class);

        $sites = $service->getAllCraftSites();

        // Attempt duplicate check - if it fails we still show the page but warn the user
        $monitoredUrls          = [];
        $monitorCheckFailed     = false;
        $monitorCheckFailReason = '';
        try {
            $monitoredUrls = $service->getMonitoredUrls();
        } catch (\Throwable $e) {
            $monitorCheckFailed     = true;
            $monitorCheckFailReason = $e->getMessage();
            Log::warning("getMonitoredUrls failed on multisite setup: {$e->getMessage()}");
        }

        foreach ($sites as &$site) {
            if ($site['resolvedUrl'] !== null) {
                $normalized = strtolower(rtrim($site['resolvedUrl'], '/'));
                $site['alreadyMonitored'] = in_array($normalized, $monitoredUrls, true);
            } else {
                $site['alreadyMonitored'] = false;
            }
        }
        unset($site);

        $activeSites   = array_values(array_filter($sites, fn($s) => $s['hasUrl']));
        $excludedSites = array_values(array_filter($sites, fn($s) => !$s['hasUrl']));
        $userDetails   = $service->getUserDetails();

        return $this->renderTemplate(Constants::SUBNAV_ITEM_MULTISITE_SETUP['template'], [
            'title'                  => t('Multi-Site Monitor Setup', [], 'upsnap'),
            'selectedSubnavItem'     => Constants::SUBNAV_ITEM_SETTINGS['key'],
            'sites'                  => $sites,
            'activeSites'            => $activeSites,
            'excludedSites'          => $excludedSites,
            'monitorsUrl'            => Url::cpUrl(Constants::SUBNAV_ITEM_MONITORS['url']),
            'settingsUrl'            => Url::cpUrl(Constants::SUBNAV_ITEM_SETTINGS['url']),
            'monitorCheckFailed'     => $monitorCheckFailed,
            'monitorCheckFailReason' => $monitorCheckFailReason,
            'userDetails'            => $userDetails,
        ]);
    }

    /**
     * Create UpSnap monitors for the selected Craft sites.
     * POST upsnap/settings/bulk-create-monitors
     */
    public function bulkCreateMonitors(): Response
    {
        $service = Upsnap::getInstance()->settingsService;

        // Re-validate token - it may have expired between page load and submit
        $service->validateApiKey();
        if ($service->getApiTokenStatus() !== Constants::API_KEY_STATUS['active']) {
            return $this->asJson([
                'success' => false,
                'message' => t('Your API token is no longer active. Please update it in Settings.', [], 'upsnap'),
            ]);
        }

        $sites = request()->input('sites', []);

        if (empty($sites) || !is_array($sites)) {
            return $this->asJson([
                'success' => false,
                'message' => t('No sites selected.', [], 'upsnap'),
            ]);
        }

        // Fetch existing monitored URLs (normalized lowercase) for duplicate check
        $monitoredUrls = [];
        try {
            $monitoredUrls = $service->getMonitoredUrls();
        } catch (\Throwable $e) {
            Log::warning("Could not fetch monitored URLs during bulk create: {$e->getMessage()}");
            // Continue - the API will reject true duplicates anyway
        }

        $results             = [];
        $firstCreatedId      = null;
        $firstCreatedUrl     = null;
        $hasExistingPrimary  = $service->getMonitorId() !== null;
        $endpoint            = Constants::MICROSERVICE_ENDPOINTS['monitors']['create'];

        foreach ($sites as $site) {
            $name = trim($site['name'] ?? '');
            $url  = trim($site['url']  ?? '');

            if ($url === '') {
                $results[] = ['name' => $name, 'url' => '', 'status' => 'skipped', 'message' => t('No URL configured.', [], 'upsnap')];
                continue;
            }

            if (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
                $results[] = ['name' => $name, 'url' => $url, 'status' => 'skipped', 'message' => t('Invalid or unsupported URL.', [], 'upsnap')];
                continue;
            }

            $normalizedUrl = strtolower(rtrim($url, '/'));

            if (in_array($normalizedUrl, $monitoredUrls, true)) {
                $results[] = ['name' => $name, 'url' => $url, 'status' => 'skipped', 'message' => t('Monitor already exists for this URL.', [], 'upsnap')];
                continue;
            }

            try {
                $response = Upsnap::$plugin->apiService->post($endpoint, [
                    'name'         => $name !== '' ? $name : 'Monitor',
                    'service_type' => Constants::SERVICE_TYPES['website'],
                    'config'       => ['meta' => ['url' => $url]],
                    'is_enabled'   => true,
                ]);

                if (($response['status'] ?? '') === 'success') {
                    $monitorData = $response['data']['monitor'] ?? $response['data'] ?? [];
                    $monitorId   = $monitorData['id'] ?? null;

                    if ($firstCreatedId === null && $monitorId !== null) {
                        $firstCreatedId  = $monitorId;
                        $firstCreatedUrl = $url;
                    }

                    $monitoredUrls[] = $normalizedUrl;
                    $results[] = ['name' => $name, 'url' => $url, 'status' => 'created', 'message' => t('Monitor created.', [], 'upsnap')];
                } else {
                    $results[] = ['name' => $name, 'url' => $url, 'status' => 'failed', 'message' => $response['message'] ?? t('Failed to create monitor.', [], 'upsnap')];
                }
            } catch (\Throwable $e) {
                Log::error("Bulk monitor creation failed for {$url}: {$e->getMessage()}");
                $results[] = ['name' => $name, 'url' => $url, 'status' => 'failed', 'message' => t('An error occurred.', [], 'upsnap')];
            }
        }

        if (!$hasExistingPrimary && $firstCreatedId !== null) {
            $service->setMonitorId($firstCreatedId);
            $service->setMonitoringUrl($firstCreatedUrl);
        }

        $created = count(array_filter($results, fn($r) => $r['status'] === 'created'));
        $skipped = count(array_filter($results, fn($r) => $r['status'] === 'skipped'));
        $failed  = count(array_filter($results, fn($r) => $r['status'] === 'failed'));

        return $this->asJson([
            'success'     => true,
            'summary'     => compact('created', 'skipped', 'failed'),
            'results'     => $results,
            'redirectUrl' => Url::cpUrl(Constants::SUBNAV_ITEM_MONITORS['url']),
        ]);
    }
}
