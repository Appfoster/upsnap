<?php

namespace appfoster\upsnap\services;

use Craft;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

use appfoster\upsnap\Constants;
use appfoster\upsnap\Upsnap;
use Illuminate\Support\Facades\Log;
use CraftCms\Cms\Cms;

class ApiService
{
    protected string $baseUrl;
    protected string $apiVersion;
    protected ?string $apiToken = null;
    protected Client $client;

    public function __construct()
    {
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
            Log::error("API GET failed: " . $e->getMessage());
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
            Log::error("API POST failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Make a multipart POST request
     */
    public function postMultipart(string $endpoint, array $multipartParts = [], array $headers = []): ?array
    {
        try {
            $response = $this->client->post($endpoint, [
                'headers' => array_merge($this->getHeaders(), $headers),
                'multipart' => $multipartParts,
            ]);

            return json_decode((string) $response->getBody(), true);
        } catch (RequestException $e) {
            Log::error("API multipart POST failed: " . $e->getMessage());
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
            Log::error("API PUT failed: " . $e->getMessage());
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
            Log::error("API PUT failed: " . $e->getMessage());
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
            Log::error("API DELETE failed: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Record installation data
     */
    public function recordInstallationData(string $siteUrl, ?string $email = null, ?string $name = null, ?string $craftInstallId = null): ?array
    {
        $body = [
            'platform' => 'craft',
            'details' => [
                'site_url' => $siteUrl,
                'email' => $email,
                'name' => $name,
                'install_id' => $craftInstallId,
                'plugin_version' => Upsnap::getInstance()->getVersion(),
                'craft_version' => Cms::version(),
            ]
        ];

        try {
            return $this->adminPost('installation-data', $body);
        } catch (\Throwable $e) {
            Log::error("Failed to record installation data: " . $e->getMessage());
            return null;
        }
    }

    private function adminPost(string $path, array $body): ?array
    {
        $url = Constants::getAPIBaseUrl() . '/admin/v1/' . $path;
        $response = $this->client->post($url, [
            'headers' => [
                'Accept' => 'application/json',
                'X-Requested-From' => 'craft',
            ],
            'json' => $body,
        ]);
        return json_decode((string) $response->getBody(), true);
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
            Log::error("Failed to fetch monitor incidents: " . $e->getMessage());
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
            Log::error('API getRaw failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Sign up a new UpSnap user from within CraftCMS.
     *
     */
    public function signupUser(string $email, string $password, string $fullname): array
    {
        // Real API call
        try {
            $result = $this->post(Constants::MICROSERVICE_ENDPOINTS['user']['register'], [
                'email' => $email,
                'password' => $password,
                'fullname' => $fullname,
                'source' => Constants::REGISTER_SOURCE,
            ]);
            return $result;
        } catch (RequestException $e) {
            Log::error("Signup API failed: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Signup failed. Please try again.',
            ];
        }
    }

    /**
     * Login user
     *
     * @param string $email
     * @param string $password
     * @return array
     */
    public function loginUser(string $email, string $password): array
    {
        // Real API call
        try {
            $result = $this->post(Constants::MICROSERVICE_ENDPOINTS['user']['login'], [
                'email' => $email,
                'password' => $password,
            ]);
            return $result;
        } catch (RequestException $e) {
            Log::error("Login API failed: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Login failed. Please try again.',
            ];
        }
    }

    /**
     * Get user tokens using session token
     *
     * @param string $sessionToken
     * @return array
     */
    public function getTokens(string $sessionToken): array
    {
        $originalToken = $this->apiToken;
        $this->apiToken = $sessionToken;

        try {
            $result = $this->get(Constants::MICROSERVICE_ENDPOINTS['tokens']['list']);
            return $result;
        } catch (RequestException $e) {
            Log::error("Get tokens API failed: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Failed to retrieve tokens.',
            ];
        } finally {
            $this->apiToken = $originalToken;
        }
    }

    /**
     * Generate new token using session token
     *
     * @param string $sessionToken
     * @return array
     */
    public function generateToken(string $sessionToken): array
    {
        $originalToken = $this->apiToken;
        $this->apiToken = $sessionToken;

        try {
            $result = $this->post(Constants::MICROSERVICE_ENDPOINTS['tokens']['generate'], [
                'name' => 'CraftCMS Plugin Token',
                'description' => 'Token for CraftCMS health check plugin',
                'expires' => null,
            ]);
            return $result;
        } catch (RequestException $e) {
            Log::error("Generate token API failed: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Failed to generate token.',
            ];
        } finally {
            $this->apiToken = $originalToken;
        }
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

    /**
     * Get the current API token
     */
    public function getApiToken(): ?string
    {
        return $this->apiToken;
    }

    /**
     * Set the API token
     */
    public function setApiToken(?string $token): void
    {
        $this->apiToken = $token;
    }
}
