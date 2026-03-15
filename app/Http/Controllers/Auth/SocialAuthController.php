<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\View\View;

class SocialAuthController extends Controller
{
    public function yandexRedirect(Request $request): RedirectResponse
    {
        $clientId = config('services.yandex.client_id');

        if (! is_string($clientId) || $clientId === '') {
            return redirect()
                ->route('home')
                ->withErrors(['social' => 'Не заполнен YANDEX_CLIENT_ID.']);
        }

        $state = Str::random(40);
        $request->session()->put('oauth_yandex_state', $state);

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => $clientId,
            'redirect_uri' => $this->resolveYandexRedirectUrl(),
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away('https://oauth.yandex.ru/authorize?'.$query);
    }

    public function yandexCallback(Request $request): RedirectResponse
    {
        $expectedState = $request->session()->pull('oauth_yandex_state');
        $actualState = $request->query('state');

        if (! is_string($expectedState) || ! is_string($actualState) || ! hash_equals($expectedState, $actualState)) {
            return redirect()
                ->route('home')
                ->withErrors(['social' => 'Не удалось подтвердить сессию Yandex OAuth.']);
        }

        $authCode = $request->query('code');

        if (! is_string($authCode) || $authCode === '') {
            return redirect()
                ->route('home')
                ->withErrors(['social' => 'Не удалось получить код авторизации Yandex.']);
        }

        $token = $this->exchangeYandexCodeForToken($authCode);

        if ($token === null) {
            return redirect()
                ->route('home')
                ->withErrors(['social' => 'Не удалось получить токен Yandex OAuth.']);
        }

        $profile = $this->fetchYandexProfile($token);

        if ($profile === null || ! isset($profile['id']) || ! is_string($profile['id']) || $profile['id'] === '') {
            return redirect()
                ->route('home')
                ->withErrors(['social' => 'Не удалось получить профиль Yandex.']);
        }

        $name = $this->resolveSocialName(
            $profile['real_name'] ?? null,
            $profile['display_name'] ?? null,
            $profile['login'] ?? null,
            'Yandex user',
        );

        $email = null;
        if (isset($profile['default_email']) && is_string($profile['default_email']) && $profile['default_email'] !== '') {
            $email = $profile['default_email'];
        }

        $user = $this->resolveUser(
            provider: 'yandex',
            providerId: $profile['id'],
            name: $name,
            email: $email,
            avatar: $this->resolveYandexAvatar($profile),
        );

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function telegramRedirect(): RedirectResponse
    {
        $botId = $this->resolveTelegramBotId();

        if ($botId === null) {
            return redirect()
                ->route('home')
                ->withErrors([
                    'telegram' => 'Не заполнен TELEGRAM_BOT_TOKEN.',
                ]);
        }

        $query = http_build_query([
            'bot_id' => $botId,
            'origin' => $this->resolveTelegramOrigin(),
            'return_to' => route('auth.telegram.callback'),
            'request_access' => 'write',
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away('https://oauth.telegram.org/auth?'.$query);
    }

    public function telegramCallback(Request $request): RedirectResponse|View
    {
        $payload = $this->extractTelegramPayload($request);

        if (! isset($payload['hash']) && $request->isMethod('get')) {
            return view('auth.telegram-callback', [
                'postUrl' => route('auth.telegram.callback'),
            ]);
        }

        if (! $this->hasValidTelegramSignature($payload)) {
            return redirect()
                ->route('home')
                ->withErrors([
                    'telegram' => 'Не удалось подтвердить вход через Telegram.',
                ]);
        }

        $authDate = (int) ($payload['auth_date'] ?? 0);
        if ($authDate < now()->subDay()->timestamp) {
            return redirect()
                ->route('home')
                ->withErrors([
                    'telegram' => 'Сессия Telegram устарела, попробуйте снова.',
                ]);
        }

        $telegramId = (string) ($payload['id'] ?? '');
        if ($telegramId === '') {
            return redirect()
                ->route('home')
                ->withErrors([
                    'telegram' => 'Не удалось получить ID Telegram.',
                ]);
        }

        $name = trim(implode(' ', array_filter([
            $payload['first_name'] ?? null,
            $payload['last_name'] ?? null,
        ])));

        if ($name === '') {
            $username = $payload['username'] ?? null;
            $name = is_string($username) && $username !== ''
                ? '@'.$username
                : 'Telegram user';
        }

        $avatar = isset($payload['photo_url']) && is_string($payload['photo_url'])
            ? $payload['photo_url']
            : null;

        $user = $this->resolveUser(
            provider: 'telegram',
            providerId: $telegramId,
            name: $name,
            email: sprintf('telegram_%s@users.hmm.local', $telegramId),
            avatar: $avatar,
        );

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchYandexProfile(string $accessToken): ?array
    {
        $response = Http::withToken($accessToken, 'OAuth')
            ->acceptJson()
            ->get('https://login.yandex.ru/info', [
                'format' => 'json',
            ]);

        if (! $response->successful()) {
            return null;
        }

        $json = $response->json();

        return is_array($json) ? $json : null;
    }

    private function exchangeYandexCodeForToken(string $authCode): ?string
    {
        $clientId = config('services.yandex.client_id');
        $clientSecret = config('services.yandex.client_secret');

        if (! is_string($clientId) || $clientId === '' || ! is_string($clientSecret) || $clientSecret === '') {
            return null;
        }

        $response = Http::asForm()
            ->acceptJson()
            ->post('https://oauth.yandex.ru/token', [
                'grant_type' => 'authorization_code',
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $authCode,
                'redirect_uri' => $this->resolveYandexRedirectUrl(),
            ]);

        if (! $response->successful()) {
            return null;
        }

        $json = $response->json();

        if (! is_array($json) || ! isset($json['access_token']) || ! is_string($json['access_token'])) {
            return null;
        }

        return $json['access_token'];
    }

    /**
     * @param array<string, mixed> $profile
     */
    private function resolveYandexAvatar(array $profile): ?string
    {
        $avatarId = $profile['default_avatar_id'] ?? null;

        if (! is_string($avatarId) || $avatarId === '') {
            return null;
        }

        return sprintf('https://avatars.yandex.net/get-yapic/%s/islands-200', $avatarId);
    }

    private function resolveYandexRedirectUrl(): string
    {
        $configured = config('services.yandex.redirect');

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return route('auth.yandex.callback');
    }

    /**
     * @param string|null ...$candidates
     */
    private function resolveSocialName(?string ...$candidates): string
    {
        $fallback = array_pop($candidates) ?? 'User';

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return $fallback;
    }

    private function resolveUser(
        string $provider,
        string $providerId,
        string $name,
        ?string $email,
        ?string $avatar,
    ): User {
        $existingByProvider = User::query()
            ->where('oauth_provider', $provider)
            ->where('oauth_id', $providerId)
            ->first();

        if ($existingByProvider !== null) {
            $existingByProvider->forceFill([
                'name' => $name,
                'avatar' => $avatar,
            ])->save();

            return $existingByProvider;
        }

        if (is_string($email) && $email !== '') {
            $existingByEmail = User::query()
                ->where('email', $email)
                ->first();

            if ($existingByEmail !== null) {
                $existingByEmail->forceFill([
                    'oauth_provider' => $provider,
                    'oauth_id' => $providerId,
                    'avatar' => $avatar,
                    'email_verified_at' => $existingByEmail->email_verified_at ?? now(),
                ])->save();

                return $existingByEmail;
            }
        }

        $resolvedEmail = $this->resolveUniqueEmail(
            $email ?: sprintf('%s_%s@users.hmm.local', $provider, $providerId),
            $provider,
        );

        return User::query()->create([
            'name' => $name,
            'email' => $resolvedEmail,
            'password' => Hash::make(Str::random(64)),
            'email_verified_at' => now(),
            'oauth_provider' => $provider,
            'oauth_id' => $providerId,
            'avatar' => $avatar,
        ]);
    }

    private function resolveUniqueEmail(string $email, string $provider): string
    {
        if (! User::query()->where('email', $email)->exists()) {
            return $email;
        }

        do {
            $candidate = sprintf(
                '%s_%s@users.hmm.local',
                $provider,
                Str::ulid()->lower(),
            );
        } while (User::query()->where('email', $candidate)->exists());

        return $candidate;
    }

    /**
     * @param array<string, string> $payload
     */
    private function hasValidTelegramSignature(array $payload): bool
    {
        $botToken = config('services.telegram.bot_token');
        $providedHash = $payload['hash'] ?? null;

        if (! is_string($botToken) || $botToken === '' || ! is_string($providedHash) || $providedHash === '') {
            return false;
        }

        unset($payload['hash']);
        ksort($payload);

        $dataCheckString = collect($payload)
            ->map(fn (string $value, string $key): string => $key.'='.$value)
            ->implode("\n");

        $secretKey = hash('sha256', $botToken, true);
        $calculatedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        return hash_equals($calculatedHash, $providedHash);
    }

    private function resolveTelegramBotId(): ?int
    {
        $botToken = config('services.telegram.bot_token');
        if (! is_string($botToken) || $botToken === '') {
            return null;
        }

        $tokenParts = explode(':', $botToken, 2);
        if (! isset($tokenParts[0]) || ! ctype_digit($tokenParts[0])) {
            return null;
        }

        return (int) $tokenParts[0];
    }

    private function resolveTelegramOrigin(): string
    {
        $appUrl = (string) config('app.url');
        $parsed = parse_url($appUrl);

        if (! is_array($parsed) || ! isset($parsed['scheme'], $parsed['host'])) {
            return request()->getSchemeAndHttpHost();
        }

        $origin = $parsed['scheme'].'://'.$parsed['host'];

        if (isset($parsed['port'])) {
            $origin .= ':'.$parsed['port'];
        }

        return $origin;
    }

    /**
     * @return array<string, string>
     */
    private function extractTelegramPayload(Request $request): array
    {
        $source = $request->isMethod('get')
            ? $request->query()
            : $request->request->all();

        $allowedFields = [
            'id',
            'first_name',
            'last_name',
            'username',
            'photo_url',
            'auth_date',
            'hash',
            'allows_write_to_pm',
            'language_code',
        ];

        $payload = [];
        foreach ($allowedFields as $field) {
            if (! array_key_exists($field, $source)) {
                continue;
            }

            $value = $source[$field];
            if (! is_scalar($value)) {
                continue;
            }

            $payload[$field] = (string) $value;
        }

        return $payload;
    }
}
