# UpSnap Craft 6 Developer Guidelines

## CLI Commands
- Install Composer dependencies: `composer install`
- Clear Craft Cache: `php craft clear-caches/all`
- Run local Laravel/Craft development server: `npm run dev` or `php artisan serve`

## Craft 6 Architecture & Coding Conventions

### Plugin Registration
- Extends `CraftCms\Cms\Plugin\Plugin`.
- Register dependencies/singletons in `registerPlugin()`.
- Perform boot actions, publishing assets, and registering macros in `bootPlugin()`. Do not use `init()`.

### Routing
- CP routes are in `routes/cp.php` (prefixed with `upsnap`).
- Action routes are in `routes/actions.php` (no need to prefix with `upsnap/` manually).

### Controllers
- Standard classes (do not need to extend Yii's `Controller`).
- Use Laravel helpers like `request()`, `response()`, `session()`, `collect()`, `abort_unless()`.
- Actions must return Symfony/Laravel `Response` or `JsonResponse`.
- Render CP templates using `response(pageTemplate('template-path', $variables))`.

### Models & Components
- Settings model extends `CraftCms\Cms\Component\Component`.
- Rules are defined in `getRules(): array` using Laravel-style validators.

### Database Records (ORM)
- Extends `Illuminate\Database\Eloquent\Model` (Laravel Eloquent).
- Map timestamps by setting `const CREATED_AT = 'dateCreated';` and `const UPDATED_AT = 'dateUpdated';`.
- Generate model UUIDs in `booted()` under `static::creating()`.

### Asset Bundles
- Implement `CraftCms\Cms\View\LegacyAssets\LegacyAssetInterface`.
- Implement `register(HtmlStack $htmlStack): void`.
- Reference files in public folder via `asset('vendor/appfoster/upsnap/dist/...')`.

### Frontend & AJAX
- Use `Craft.getActionUrl('upsnap/...')` for dynamic action URLs instead of hardcoding `/actions/` or `/admin/` paths.
- For query parameters, append them to `Craft.getActionUrl()` dynamically (e.g. `Craft.getActionUrl('upsnap/endpoint') + '?' + params`).
- Always pass `X-CSRF-Token` header set to `Craft.csrfTokenValue` for AJAX requests (unless using unified request helpers).

