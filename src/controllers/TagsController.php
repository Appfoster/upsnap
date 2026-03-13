<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\Constants;
use Craft;
use craft\web\Controller;
use yii\web\Response;
use appfoster\upsnap\Upsnap;

class TagsController extends Controller
{
    protected array|bool|int $allowAnonymous = false;

    /**
     * List all tags for the current user.
     * GET /actions/upsnap/tags/list
     */
    public function actionList(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['tags']['list'];

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);

            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(Craft::t('upsnap', 'Something went wrong while fetching tags. Please try again.'));
            }

            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch tags.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Tags fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Tags fetch failed: {$e->getMessage()}", __METHOD__);
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create a new tag.
     * POST /actions/upsnap/tags/create
     */
    public function actionCreate(): Response
    {
        $this->requirePostRequest();
        $request = Craft::$app->getRequest();

        $name = $request->getBodyParam('name');
        $color = $request->getBodyParam('color');

        if (!$name) {
            return $this->asJson([
                'success' => false,
                'message' => Craft::t('upsnap', 'Tag name is required.'),
            ]);
        }

        // Generate random color if not provided
        if (!$color) {
            $color = sprintf('#%06X', mt_rand(0, 0xFFFFFF));
        }

        $endpoint = Constants::MICROSERVICE_ENDPOINTS['tags']['create'];

        try {
            $payload = [
                'name' => $name,
                'color' => $color,
            ];

            $response = Upsnap::$plugin->apiService->post($endpoint, $payload);

            if (!isset($response['status']) || $response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to create tag.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Tag created successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Tag creation failed: {$e->getMessage()}", __METHOD__);

            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
