<?php

namespace appfoster\upsnap\services;

use Craft;
use yii\base\Component;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

use appfoster\upsnap\Constants;

class ApiService extends Component
{
    protected string $baseUrl;
    protected string $apiVersion;
    protected string $authToken;
    protected Client $client;

    public function __construct($config = [])
    {
        parent::__construct($config);

        // Load from constants or environment
        $this->baseUrl = Constants::API_BASE_URL;
        $this->apiVersion = Constants::API_VERSION;
        $this->authToken = Constants::API_AUTH_TOKEN;

        $this->client = new Client([
            'base_uri' => $this->baseUrl . '/' . $this->apiVersion . '/',
            'timeout'  => Constants::API_TIMEOUT,
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
     * Common headers
     */
    protected function getHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->authToken,
            'Accept'        => 'application/json',
        ];
    }
}
