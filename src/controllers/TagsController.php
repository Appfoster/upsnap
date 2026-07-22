<?php
 
namespace appfoster\upsnap\controllers;
 
use appfoster\upsnap\Constants;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use appfoster\upsnap\Upsnap;
use function CraftCms\Cms\t;
 
class TagsController extends BaseController
{
    /**
     * List all tags for the current user.
     * GET /actions/upsnap/tags/list
     */
    public function list(): Response
    {
        $endpoint = Constants::MICROSERVICE_ENDPOINTS['tags']['list'];
 
        try {
            $response = Upsnap::$plugin->apiService->get($endpoint);
 
            if (!is_array($response) || !isset($response['status'])) {
                throw new \Exception(t('Something went wrong while fetching tags. Please try again.', [], 'upsnap'));
            }
 
            if ($response['status'] !== 'success') {
                $errorMsg = $response['message'] ?? t('Failed to fetch tags.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Tags fetched successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Tags fetch failed: {$e->getMessage()}");
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
    public function create(): Response
    {
        $name = request()->input('name');
        $color = request()->input('color');
 
        if (!$name) {
            return $this->asJson([
                'success' => false,
                'message' => t('Tag name is required.', [], 'upsnap'),
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
                $errorMsg = $response['message'] ?? t('Failed to create tag.', [], 'upsnap');
                throw new \Exception($errorMsg);
            }
 
            return $this->asJson([
                'success' => true,
                'message' => t('Tag created successfully.', [], 'upsnap'),
                'data' => $response['data'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error("Tag creation failed: {$e->getMessage()}");
 
            return $this->asJson([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
