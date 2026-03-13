<?php

namespace appfoster\upsnap\services;

use Craft;
use yii\base\Component;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;

class ApiService extends Component
{
    protected string $baseUrl;
    protected string $apiVersion;
    protected ?string $apiToken = null;
    protected Client $client;

    public function __construct($config = [])
    {
        parent::__construct($config);

        // Load from constants or environment
        $this->baseUrl = Constants::getAPIBaseUrl();
        $this->apiVersion = Constants::API_VERSION;
        $this->apiToken = Upsnap::getInstance()->settingsService->getApiKey();

        $this->client = new Client([
            'base_uri' => $this->baseUrl . '/' . $this->apiVersion . '/',
            'timeout'  => Constants::API_TIMEOUT,
            'http_errors' => false,
        ]);
    }

    /**
     * Make a GET request
     */
    public function get(string $endpoint, array $query = []): ?array
    {
        try {
            $response = $this->client->get($endpoint, [
                'headers' => $this->getHeaders(),
                'query'   => $query,
            ]);
            return json_decode((string) $response->getBody(), true);
        } catch (RequestException $e) {
            Craft::error("API GET failed: " . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Make a POST request
     */
    public function post(string $endpoint, array $body = []): ?array
    {
        try {
            $response = $this->client->post($endpoint, [
                'headers' => $this->getHeaders(),
                'json'    => $body,
            ]);
            return json_decode((string) $response->getBody(), true);
        } catch (RequestException $e) {
            Craft::error("API POST failed: " . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Make a PUT request
     */
    public function put(string $endpoint, array $body = []): ?array
    {
        try {
            $response = $this->client->put($endpoint, [
                'headers' => $this->getHeaders(),
                'json'    => $body,
            ]);

            return json_decode((string) $response->getBody(), true);
        } catch (RequestException $e) {
            Craft::error("API PUT failed: " . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Make a PUT request
     */
    public function patch(string $endpoint, array $body = []): ?array
    {
        try {
            $response = $this->client->patch($endpoint, [
                'headers' => $this->getHeaders(),
                'json'    => $body,
            ]);

            return json_decode((string) $response->getBody(), true);
        } catch (RequestException $e) {
            Craft::error("API PUT failed: " . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Make a DELETE request
     */
    public function delete(string $endpoint): ?array
    {
        try {
            $response = $this->client->delete($endpoint, [
                'headers' => $this->getHeaders(),
            ]);
            return json_decode((string) $response->getBody(), true);
        } catch (RequestException $e) {
            Craft::error("API DELETE failed: " . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Record installation data
     */
    public function recordInstallationData(string $siteUrl): ?array
    {
        $body = [
            'platform' => 'craft',
            'details' => [
                'site_url' => $siteUrl
            ]
        ];

        try {
            return $this->post('installation-data', $body);
        } catch (RequestException $e) {
            Craft::error("Failed to record installation data: " . $e->getMessage(), __METHOD__);
            return null;
        }
    }

    /**
     * Get monitor incidents
     *
     * @param string $timeRange Time range (e.g., '7D', '30D', '90D')
     * @param int $page Page number (default: 1)
     * @param int $pageSize Number of incidents per page (default: 50)
     * @return array|null Response data or null on failure
     */
    public function getMonitorIncidents(string $timeRange = '24h', int $page = 1, int $pageSize = 50): ?array
    {
        $query = [
            'time_range' => $timeRange,
            'page' => $page,
            'page_size' => $pageSize,
        ];

        try {
            return $this->get('user/monitors/incidents', $query);
        } catch (RequestException $e) {
            Craft::error("Failed to fetch monitor incidents: " . $e->getMessage(), __METHOD__);
            return null;
        }
    }

    /**
     * Make a raw GET request and return the binary body alongside response headers.
     * Used for file export endpoints (CSV, PDF) that return non-JSON content.
     *
     * @return array{body: string, contentType: string, contentDisposition: string}
     */
    public function getRaw(string $endpoint, array $query = [], string $accept = '*/*'): array
    {
        try {
            $response = $this->client->get($endpoint, [
                'headers' => array_merge($this->getHeaders(), ['Accept' => $accept]),
                'query'   => $query,
            ]);

            return [
                'body'               => (string) $response->getBody(),
                'contentType'        => $response->getHeaderLine('Content-Type')        ?: $accept,
                'contentDisposition' => $response->getHeaderLine('Content-Disposition') ?: 'attachment; filename=export',
            ];
        } catch (RequestException $e) {
            Craft::error('API getRaw failed: ' . $e->getMessage(), __METHOD__);
            throw $e;
        }
    }

    /**
     * Sign up a new UpSnap user from within CraftCMS.
     *
     * NOTE: Returns a mock response while the microservice signup endpoint is being
     * developed. To switch to the real API, replace the mock block below with:
     *
     *   return $this->post(Constants::ENDPOINT_SIGNUP, [
     *       'email'    => $email,
     *       'password' => $password,
     *       'source'   => 'craftcms',
     *       'site_url' => $siteUrl,
     *   ]);
     */
    public function signupUser(string $email, string $password, string $siteUrl): array
    {
        // TODO: Replace with $this->post(Constants::ENDPOINT_SIGNUP, [...]) when ready.
        $mockApiKey   = '033f292259dd5086f53f54acb2edec90453c6834f313d14a2e9e985ea3f66c14';
        $mockMonitorId = '45f0305c-30ba-42b8-970b-2920f91f20e7';

        return [
            'status' => 'success',
            'data'   => [
                'fullname'   => '',
                'email'      => $email,
                'api_key'    => $mockApiKey,
                'monitor_id' => $mockMonitorId,
                'message'    => 'Account created successfully. You are now on the Beta plan.',
            ],
        ];
    }

    /**
     * Common headers
     */
    protected function getHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->apiToken,
            'Accept'        => 'application/json',
            'X-Requested-From' => 'craft',
        ];
    }
}
