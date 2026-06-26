# Craft Patterns

## CP Dashboard Widgets

Register Craft dashboard widgets in `Upsnap::init()` with `Event::on(Dashboard::class, Dashboard::EVENT_REGISTER_WIDGET_TYPES, ...)`. Widget classes live under `src/widgets`, extend `craft\base\Widget`, and render Twig templates under `src/templates/_widgets`.
