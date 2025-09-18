<?php
namespace appfoster\sitemonitor\base;

use Craft;
use craft\log\MonologTarget;

trait PluginTrait
{
    public static function t($message, array $params = [])
    {
		return Craft::t('site-monitor', $message, $params);
    }

    public static function log($message, $type = 'info')
    {
		Craft::$type(self::t($message), __METHOD__);
    }

    public static function info($message)
    {
		Craft::info(self::t($message), __METHOD__);
    }

    public static function error($message)
    {
		Craft::error(self::t($message), __METHOD__);
    }

	private function _setLogging()
    {
		Craft::getLogger()->dispatcher->targets[] = new MonologTarget([
			'name' => 'site-monitor',
			'allowLineBreaks' => true
		]);
    }
}