<?php

namespace appfoster\sitemonitor\services;

use Craft;
use craft\helpers\App;
use yii\base\Component;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class ApiService extends Component
{
    protected string $baseUrl;
    protected string $apiVersion;
    protected string $authToken;
    protected Client $client;

    public function __construct($config = [])
    {
        parent::__construct($config);

        // Ideally load from plugin settings
        $this->baseUrl = 'https://eagle-eye.appfoster.site';
        $this->apiVersion = 'v1';
        $this->authToken ='test-token';

        $this->client = new Client([
            'base_uri' => $this->baseUrl . '/' . $this->apiVersion . '/',
            'timeout'  => 10.0,
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
