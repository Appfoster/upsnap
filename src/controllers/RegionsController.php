<?php

namespace appfoster\upsnap\controllers;

use appfoster\upsnap\assetbundles\MonitorsAsset;
use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use function CraftCms\Cms\t;

class RegionsController extends BaseController
{
    public function __construct()
    {
        parent::__construct();
        app(InternalAssetRegistry::class)->register(MonitorsAsset::class);
    }

    public function list(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['regions']['list'];

        try {
            $response = Upsnap::$plugin->apiService->get($endpoint, ['last_day_uptimes' => true]);

            // Ensure $response is an array before accessing its keys
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching regions. Please try again.', [], 'upsnap'));
            }

            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch regions.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }

            return $this->asJson([
                'success' => true,
                'message' => t('Regions fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Regions fetch failed: {$e->getMessage()}");
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
