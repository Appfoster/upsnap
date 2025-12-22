<?php

namespace appfoster\upsnap\services;

use craft\web\Response;
use appfoster\upsnap\Upsnap;

class HealthCheckService
{
	public $controller;

	public function __construct($controller)
	{
		$this->controller = $controller;
	}

	public function prepareData(array $response, array $subnavItem, bool $isAjax = false): array
	{
		$data = [
			'success' => $response['data']['status'] ?? 'error',
			'message' => $response['data']['message'] ?? '',
			'data' => $response['data'] ?? [],
			'error' => $response['data']['error'] ?? null,
			'title' => $subnavItem['label'],
            'selectedSubnavItem' => $subnavItem['key']
		];
		if($isAjax) {
			$data['url'] = $subnavItem['url'];
		}
		return $data;
	}

	public function handleMissingMonitoringUrl(array $subnavItem): Response
	{
		$response['data']['status'] = 'warning';
		$response['data']['message'] = 'Monitoring URL is not set. Please configure it in the settings.';
		return $this->sendResponse($this->prepareData($response, $subnavItem), $subnavItem['template']);
	}

	public function sendResponse(array $data, string $template): Response
	{
		return $this->controller->renderTemplate($template, $data);
	}

	/**
	 * @param string $url
	 * @param array $params possible values one of: ["uptime", "broken-links", "domain-check"]
	 * @return array|mixed
	 */
	public function getHealthcheck($url, $params, $forceFetch=false, $seoStrategy = null)
	{
		return Upsnap::$plugin->apiService->post('healthcheck', [
			'url' => $url,
			"checks" => $params,
			'strategy' => $seoStrategy,
			'force_fetch' => $forceFetch
		]);
	}
}