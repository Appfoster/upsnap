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
                'message' => Craft::t('upsnap', 'Failed to add monitor.'),
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function actionList(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['list'];

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
            if (!isset($response['status']) || $response['status'] !== 'success') {
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
                'message' => Craft::t('upsnap', 'Failed to fetch monitors.'),
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function actionDetails(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $id = $request->getBodyParam('id');
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['monitors']['view'];

        if (!$id) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Monitor ID is required.'),
            ]);
        }

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch monitor details.');
                throw new \Exception($errorMsg);
            }
            $endpoint = str_replace('{id}', $id, $endpoint);


            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Monitor details fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Monitor details fetch failed: {$e->getMessage()}", __METHOD__);
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Failed to fetch monitor details.'),
                'error' => $e->getMessage(),
            ]);
        }
    }
}
