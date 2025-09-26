<?php
namespace appfoster\upsnap\services;

use yii\base\Component;
use appfoster\upsnap\Upsnap;

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
        return         
        $mockHistory = [
            [
                'id' => 1,
                'type' => 'Uptime',
                'site' => 'prisha-ecoforge.appfoster.site',
                'status' => 'succeeded',
                'timestamp' => '2025-09-22 14:53:14',
                'duration' => '< 1 second',
                'httpCode' => 200,
                'responseTime' => 245,
                'location' => 'Seoul, South Korea',
                'ip' => '158.247.212.166',
                'details' => [
                    'message' => 'Site is online and responding normally',
                    'contentLength' => 15420,
                    'sslValid' => true
                ]
            ],
            [
                'id' => 2,
                'type' => 'Uptime',
                'site' => 'prisha-ecoforge.appfoster.site',
                'status' => 'succeeded',
                'timestamp' => '2025-09-18 22:18:35',
                'duration' => '1.2 seconds',
                'httpCode' => 200,
                'responseTime' => 1200,
                'location' => 'Seoul, South Korea',
                'ip' => '158.247.212.166',
                'details' => [
                    'message' => 'Site is online and responding normally',
                    'contentLength' => 15420,
                    'sslValid' => true
                ]
            ],
            [
                'id' => 3,
                'type' => 'Uptime',
                'site' => 'prisha-ecoforge.appfoster.site',
                'status' => 'failed',
                'timestamp' => '2025-09-15 10:45:22',
                'duration' => '30 seconds',
                'httpCode' => 500,
                'responseTime' => null,
                'location' => 'Seoul, South Korea',
                'ip' => '158.247.212.166',
                'details' => [
                    'message' => 'Server returned 500 Internal Server Error',
                    'error' => 'Connection timeout after 30 seconds'
                ]
            ],
            [
                'id' => 4,
                'type' => 'Uptime',
                'site' => 'prisha-ecoforge.appfoster.site',
                'status' => 'succeeded',
                'timestamp' => '2025-09-12 08:30:15',
                'duration' => '0.8 seconds',
                'httpCode' => 200,
                'responseTime' => 800,
                'location' => 'Seoul, South Korea',
                'ip' => '158.247.212.166',
                'details' => [
                    'message' => 'Site is online and responding normally',
                    'contentLength' => 15420,
                    'sslValid' => true
                ]
            ],
            [
                'id' => 5,
                'type' => 'Uptime',
                'site' => 'prisha-ecoforge.appfoster.site',
                'status' => 'warning',
                'timestamp' => '2025-09-10 16:22:45',
                'duration' => '5.5 seconds',
                'httpCode' => 200,
                'responseTime' => 5500,
                'location' => 'Seoul, South Korea',
                'ip' => '158.247.212.166',
                'details' => [
                    'message' => 'Site is responding but slowly',
                    'contentLength' => 15420,
                    'sslValid' => true,
                    'warning' => 'Response time exceeded 5 seconds'
                ]
            ]
        ];

        // return Upsnap::$plugin->apiService->get("/history?service=$service", [
        //     'start'  => $startDate,
        //     'end'    => $endDate
        // ]);
    }
}
