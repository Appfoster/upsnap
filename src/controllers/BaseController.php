<?php
 
namespace appfoster\upsnap\controllers;
 
use CraftCms\Cms\Http\RespondsWithFlash;
use CraftCms\Cms\View\LegacyAssets\InternalAssetRegistry;
use appfoster\upsnap\assetbundles\BaseAsset;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Http\JsonResponse;
use function CraftCms\Cms\currentUser;
use function CraftCms\Cms\pageTemplate;
 
class BaseController
{
    use RespondsWithFlash;
 
    public function __construct()
    {
        // Register the BaseAsset bundle
        app(InternalAssetRegistry::class)->register(BaseAsset::class);
    }
 
    /**
     * Renders a Control Panel template.
     */
    public function renderTemplate(string $template, array $variables = []): Response
    {
        return response(pageTemplate($template, $variables));
    }
 
    /**
     * Returns a JSON response.
     */
    public function asJson(mixed $data): JsonResponse
    {
        return response()->json($data);
    }
}