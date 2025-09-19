<?php
namespace appfoster\sitemonitor\services;

use yii\base\Component;
use appfoster\sitemonitor\SiteMonitor;

class HistoryService extends Component
{
    /**
     * Get monitoring history for a specific service/module.
     *
     * @param string $service  Service name (e.g., "uptime", "ssl", "broken-links")
     * @param string $startDate 
     * @param string $endDate
     * @return array|null
     */
    public function getHistory(string $service, string $startDate, string $endDate)
    {
        return SiteMonitor::$plugin->apiService->get("/history?service=$service", [
            'start'  => $startDate,
            'end'    => $endDate
        ]);
    }
}
