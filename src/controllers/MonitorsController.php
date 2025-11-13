<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\Constants;
use Craft;
use craft\web\Controller;
use yii\web\Response;
use appfoster\upsnap\Upsnap;

class MonitorsController extends Controller
{
    protected array|bool|int $allowAnonymous = false;

    public function actionCreate(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $name = $request->getBodyParam('name');
        $url = $request->getBodyParam('url');
        $tags = $request->getBodyParam('tags', ['default']); // optional
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['create'];

        if (!$name || !$url) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor name and URL are required.'),
            ]);
        }

        try {
            // Construct payload for microservice
            $payload = [
                'name' => $name,
                'service_type' => Constants::SERVICE_TYPES['website'],
                'config' => [
                    'meta' => [
                        'url' => $url,
                    ],
                ],
                'is_enabled' => true,
                'tags' => $tags,
            ];

            // Send request to the microservice
            $response = Upsnap::$plugin->apiService->post($endpoint, $payload);

            // Check success or errors
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to create monitor.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor added successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor creation failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function actionList(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['list'];

        try {
            $response = [];
            $response = Upsnap::$plugin->apiService->get($endpoint);

            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(Craft::t('upsnap', 'Something went wrong while fetching monitors. Please try again.'));
            }

            if (!isset($response['status']) || $response['status'] !== 'success') {
                Craft::error("error message" . $response['message'], __METHOD__);
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch monitors.');

                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitors fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitors fetch failed: {$e->getMessage()}", __METHOD__);
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Update a monitor.
     *
     * This action requires a POST request.
     *
     * @throws \Throwable
     */
    public function actionUpdate(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $settingsService->getMonitorId();
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID is required.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['update'];

        try {
            // Prepare the payload using a helper
            $payload = $this->prepareMonitorPayload($request);

            // Send request to microservice
            $response = Upsnap::$plugin->apiService->put("{$endpoint}/{$id}", $payload);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to update monitor.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor updated successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor update failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Delete a monitor.
     *
     * This action requires a POST request.
     *
     * @throws \Throwable
     */
    public function actionDelete(): Response
    {
        $settingsService = Upsnap::$plugin->settingsService;
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $request->getBodyParam('monitorId');
        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID is required.'),
            ]);
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['delete'];

        try {
            $response = Upsnap::$plugin->apiService->delete("{$endpoint}/{$id}");

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to delete monitor.');
                throw new \Exception($errorMsg);
            }

            $primaryMonitor = $settingsService->getMonitorId();

            if($primaryMonitor == $id) {
                $settingsService->setMonitorId(null);
                $settingsService->setMonitoringUrl(null);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor deleted successfully.'),
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor delete failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Prepare the payload for creating or updating a monitor.
     */
    private function prepareMonitorPayload($request): array
    {
        $tags = $request->getBodyParam('tags', ['default']);
        $isEnabled = (bool)$request->getBodyParam('enabled', true);

        $services = [
            'broken_links' => [
                'enabled' => (bool)$request->getBodyParam('brokenLinksEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('brokenLinksMonitoringInterval', 3700),
            ],
            'domain' => [
                'enabled' => (bool)$request->getBodyParam('domainEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('domainMonitoringInterval', 86400),
                'notify_days_before_expiry' => (int)$request->getBodyParam('domainDaysBeforeExpiryAlert', 7),
            ],
            'lighthouse' => [
                'enabled' => (bool)$request->getBodyParam('lighthouseEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('lighthouseMonitoringInterval', 86400),
                'strategy' => $request->getBodyParam('lighthouseStrategy', 'desktop'),
            ],
            'mixed_content' => [
                'enabled' => (bool)$request->getBodyParam('mixedContentEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('mixedContentMonitoringInterval', 3600),
            ],
            'ssl' => [
                'enabled' => (bool)$request->getBodyParam('securityCertificatesEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('securityCertificatesMonitoringInterval', 3600),
                'notify_days_before_expiry' => (int)$request->getBodyParam('sslDaysBeforeExpiryAlert', 7),
            ],
            'uptime' => [
                'enabled' => (bool)$request->getBodyParam('reachabilityEnabled', true),
                'monitor_interval' => (int)$request->getBodyParam('reachabilityMonitoringInterval', 300),
            ],
        ];

        return [
            'service_type' => Constants::SERVICE_TYPES['website'],
            'config' => [
                'services' => $services,
            ],
            'is_enabled' => $isEnabled,
            'tags' => $tags,
        ];
    }
}
