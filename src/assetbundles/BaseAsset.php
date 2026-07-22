<?php
namespace appfoster\upsnap\assetbundles;

use CraftCms\Cms\View\LegacyAssets\LegacyAssetInterface;
use CraftCms\Cms\View\HtmlStack;
use CraftCms\Cms\View\LegacyAssets\CpAsset;

class BaseAsset implements LegacyAssetInterface
{
    public array $depends = [
        CpAsset::class,
    ];

    public array $js = [];
    public array $css = [];

    public function init(): void
    {
        // No-op — child classes can safely call parent::init()
    }

    public function register(HtmlStack $htmlStack): void
    {
        // 1. Call init if it exists to populate js/css arrays
        if (method_exists($this, 'init')) {
            $this->init();
        }

        // 2. Register base assets if this is not the base class itself
        if (static::class !== self::class) {
            $base = new self();
            $base->register($htmlStack);
        } else {
            // Register base assets
            $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/global.js'));
            $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/js/chart.umd.min.js'));
            $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/css/global.css'));
            return;
        }

        // 3. Register child-specific assets
        foreach ($this->js as $file) {
            $htmlStack->jsFile(asset('vendor/appfoster/upsnap/dist/' . $file));
        }

        foreach ($this->css as $file) {
            $htmlStack->cssFile(asset('vendor/appfoster/upsnap/dist/' . $file));
        }
    }
}