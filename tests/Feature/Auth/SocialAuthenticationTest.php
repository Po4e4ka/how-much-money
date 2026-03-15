<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocialAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_via_yandex_callback(): void
    {
        config()->set('services.yandex.client_id', 'test-client-id');
        config()->set('services.yandex.client_secret', 'test-client-secret');
        config()->set('services.yandex.redirect', route('auth.yandex.callback'));

        Http::fake([
            'https://oauth.yandex.ru/token' => Http::response([
                'access_token' => 'test-yandex-token',
            ], 200),
            'https://login.yandex.ru/info*' => Http::response([
                'id' => 'ya-123',
                'login' => 'ya_login',
                'real_name' => 'Yandex User',
                'default_email' => 'yandex@example.com',
                'default_avatar_id' => '12345/abcdef',
            ], 200),
        ]);

        $response = $this
            ->withSession(['oauth_yandex_state' => 'state-123'])
            ->get(route('auth.yandex.callback', [
                'state' => 'state-123',
                'code' => 'test-code',
            ]));

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        $this->assertDatabaseHas('users', [
            'email' => 'yandex@example.com',
            'oauth_provider' => 'yandex',
            'oauth_id' => 'ya-123',
        ]);
    }

    public function test_users_can_authenticate_via_telegram_callback(): void
    {
        config()->set('services.telegram.bot_token', '123456:telegram_token');

        $payload = [
            'id' => '987654321',
            'first_name' => 'Ivan',
            'last_name' => 'Petrov',
            'username' => 'ivanpetrov',
            'auth_date' => (string) now()->timestamp,
        ];
        $signedPayload = [...$payload, 'hash' => $this->buildTelegramHash($payload)];

        $response = $this->get(route('auth.telegram.callback', $signedPayload));

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        $this->assertDatabaseHas('users', [
            'oauth_provider' => 'telegram',
            'oauth_id' => '987654321',
            'email' => 'telegram_987654321@users.hmm.local',
        ]);
    }

    /**
     * @param array<string, string> $payload
     */
    private function buildTelegramHash(array $payload): string
    {
        ksort($payload);

        $dataCheckString = collect($payload)
            ->map(fn (string $value, string $key): string => $key.'='.$value)
            ->implode("\n");

        $secretKey = hash('sha256', (string) config('services.telegram.bot_token'), true);

        return hash_hmac('sha256', $dataCheckString, $secretKey);
    }
}
