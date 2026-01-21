<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\MonitorsAsset;
use appfoster\upsnap\Constants;
use Craft;
use craft\web\Controller;
use yii\web\Response;
use appfoster\upsnap\Upsnap;

class RegionsController extends Controller
{
    protected array|bool|int $allowAnonymous = false;

    public function __construct($id, $module = null)
    {
        parent::__construct($id, $module);
        MonitorsAsset::register($this->view);
    }
    public function actionList(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['regions']['list'];

        try {
            $response = [];
            $response = Upsnap::$plugin->apiService->get($endpoint, ['last_day_uptimes' => true]);

            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(Craft::t('upsnap', 'Something went wrong while fetching regions. Please try again.'));
            }

            if (!isset($response['status']) || $response['status'] !== 'success') {
                Craft::error("error message" . $response['message'], __METHOD__);
                $errorMsg = $response['message'] ?? Craft::t('upsnap', 'Failed to fetch regions.');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => Craft::t('upsnap', 'Regions fetched successfully.'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Craft::error("Regions fetch failed: {$e->getMessage()}", __METHOD__);
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
