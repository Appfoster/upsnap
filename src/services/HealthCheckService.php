<?php
 
namespace appfoster\upsnap\services;
 
use CraftCms\Cms\Support\Url;
use Symfony\Component\HttpFoundation\Response;
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
        if ($isAjax) {
            $data['url'] = Url::cpUrl($subnavItem['url']);
 
            $monitorId = request()->input('monitor_id') ?: request()->query('monitor_id');
 
            if ($monitorId) {
                $separator = strpos($data['url'], '?') === false ? '?' : '&';
                $data['url'] .= $separator . 'monitor_id=' . urlencode((string)$monitorId);
            }
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
    public function getHealthcheck($url, $params, $forceFetch=false, $seoStrategy = null, ?string $region = null)
    {
        $payload = [
            'url' => $url,
            "checks" => $params,
            'strategy' => $seoStrategy,
            'force_fetch' => $forceFetch,
        ];
        
        if ($region !== null) {
            $payload['region'] = $region;
        }
        
        return Upsnap::$plugin->apiService->post('healthcheck', $payload);
    }
}