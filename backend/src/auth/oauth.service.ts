import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuthService } from './auth.service';
import { OAuthAuthorizationRequest, OAuthProviderConfig, OAuthProviderId, RemoteOAuthProfile } from './oauth.types';

interface OAuthStatePayload {
  provider: OAuthProviderId;
  nonce: string;
  createdAt: number;
}

@Injectable()
export class OAuthService {
  private readonly stateTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  listProviders() {
    return this.getProviders().map((provider) => ({
      id: provider.id,
      label: provider.label,
      enabled: this.isProviderEnabled(provider),
    }));
  }

  getAuthorizationRequest(providerId: string): OAuthAuthorizationRequest {
    const provider = this.getEnabledProvider(providerId);
    const callbackUrl = this.getCallbackUrl(provider.id);
    const authorizationUrl = new URL(provider.authorizationUrl);
    const state = this.createState(provider.id);

    authorizationUrl.searchParams.set('client_id', provider.clientId ?? '');
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', provider.scopes.join(' '));
    authorizationUrl.searchParams.set('state', state);

    return { url: authorizationUrl.toString(), state, maxAgeMs: this.stateTtlMs };
  }

  async completeLogin(providerId: string, code: string, state: string, expectedState: string | undefined) {
    const provider = this.getEnabledProvider(providerId);
    this.validateState(state, provider.id, expectedState);

    const accessToken = await this.exchangeCode(provider, code);
    const profile = await this.fetchProfile(provider, accessToken);

    return this.authService.loginWithOAuth(profile);
  }

  getFrontendRedirectUrl(path = '/oauth/callback') {
    return `${this.getFrontendUrl()}${path}`;
  }

  usesSecureCookies() {
    return this.getCallbackUrl('google').startsWith('https://');
  }

  private getProviders(): OAuthProviderConfig[] {
    return [
      {
        id: 'google',
        label: 'Google',
        clientId: this.getCredential('OAUTH_GOOGLE_CLIENT_ID'),
        clientSecret: this.getCredential('OAUTH_GOOGLE_CLIENT_SECRET'),
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile'],
      },
      {
        id: 'github',
        label: 'GitHub',
        clientId: this.getCredential('OAUTH_GITHUB_CLIENT_ID'),
        clientSecret: this.getCredential('OAUTH_GITHUB_CLIENT_SECRET'),
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        profileUrl: 'https://api.github.com/user',
        emailsUrl: 'https://api.github.com/user/emails',
        scopes: ['read:user', 'user:email'],
      },
      {
        id: '42',
        label: '42',
        clientId: this.getCredential('OAUTH_42_CLIENT_ID'),
        clientSecret: this.getCredential('OAUTH_42_CLIENT_SECRET'),
        authorizationUrl: 'https://api.intra.42.fr/oauth/authorize',
        tokenUrl: 'https://api.intra.42.fr/oauth/token',
        profileUrl: 'https://api.intra.42.fr/v2/me',
        scopes: ['public'],
      },
    ];
  }

  private getEnabledProvider(providerId: string) {
    const provider = this.getProviders().find((candidate) => candidate.id === providerId);
    if (!provider) {
      throw new BadRequestException('Unknown OAuth provider');
    }

    if (!this.isProviderEnabled(provider)) {
      throw new BadRequestException(`${provider.label} OAuth is not configured`);
    }

    return provider;
  }

  private isProviderEnabled(provider: OAuthProviderConfig) {
    return Boolean(provider.clientId && provider.clientSecret);
  }

  private async exchangeCode(provider: OAuthProviderConfig, code: string) {
    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getCallbackUrl(provider.id),
        client_id: provider.clientId ?? '',
        client_secret: provider.clientSecret ?? '',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
      throw new UnauthorizedException('OAuth token exchange failed');
    }

    return String(payload.access_token);
  }

  private async fetchProfile(provider: OAuthProviderConfig, accessToken: string): Promise<RemoteOAuthProfile> {
    const profileResponse = await fetch(provider.profileUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(provider.id === 'github' ? {
          'User-Agent': 'Lexmon',
          'X-GitHub-Api-Version': '2022-11-28',
        } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });

    const profile = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok) {
      throw new UnauthorizedException('OAuth profile fetch failed');
    }

    if (provider.id === 'google') {
      if (!profile.id || !profile.email || profile.verified_email !== true) {
        throw new UnauthorizedException('Google did not return a verified email address');
      }
      return {
        provider: provider.id,
        providerUserId: String(profile.id),
        email: this.normalizeEmail(profile.email),
        username: this.normalizeUsername(profile.email?.split('@')[0] ?? profile.name ?? 'google-user'),
        displayName: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
      };
    }

    if (provider.id === 'github') {
      const email = profile.email ?? await this.fetchGitHubEmail(provider, accessToken);
      if (!profile.id || !email) {
        throw new UnauthorizedException('GitHub did not return a verified email address');
      }
      return {
        provider: provider.id,
        providerUserId: String(profile.id),
        email: this.normalizeEmail(email),
        username: this.normalizeUsername(profile.login ?? profile.name ?? 'github-user'),
        displayName: profile.name ?? profile.login ?? null,
        avatarUrl: profile.avatar_url ?? null,
      };
    }

    if (!profile.id || !profile.email) {
      throw new UnauthorizedException('42 did not return an email address');
    }

    return {
      provider: provider.id,
      providerUserId: String(profile.id),
      email: this.normalizeEmail(profile.email),
      username: this.normalizeUsername(profile.login ?? profile.displayname ?? '42-user'),
      displayName: profile.displayname ?? profile.login ?? null,
      avatarUrl: profile.image?.link ?? profile.image_url ?? null,
    };
  }

  private async fetchGitHubEmail(provider: OAuthProviderConfig, accessToken: string) {
    if (!provider.emailsUrl) {
      return null;
    }

    const response = await fetch(provider.emailsUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Lexmon',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(10_000),
    });
    const emails = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(emails)) {
      return null;
    }

    return emails.find((email) => email.primary && email.verified)?.email ?? emails.find((email) => email.verified)?.email ?? null;
  }

  private createState(provider: OAuthProviderId) {
    const payload = this.toBase64Url(JSON.stringify({ provider, nonce: randomUUID(), createdAt: Date.now() }));
    return `${payload}.${this.sign(payload)}`;
  }

  private validateState(state: string, provider: OAuthProviderId, expectedState: string | undefined) {
    if (!expectedState || !this.constantTimeEquals(state, expectedState)) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const [payload, signature] = state.split('.');
    if (!payload || !signature || !this.constantTimeEquals(this.sign(payload), signature)) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    let parsed: OAuthStatePayload;
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthStatePayload;
    } catch {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    if (parsed.provider !== provider || Date.now() - parsed.createdAt > this.stateTtlMs) {
      throw new UnauthorizedException('Expired OAuth state');
    }
  }

  private sign(payload: string) {
    const secret = this.config.get<string>('JWT_SECRET') ?? 'change-me-in-production';
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private getCallbackUrl(provider: OAuthProviderId) {
    const callbackBaseUrl = this.config.get<string>('OAUTH_CALLBACK_BASE_URL') ?? `${this.getFrontendUrl()}/api`;
    return `${callbackBaseUrl.replace(/\/$/, '')}/auth/oauth/${provider}/callback`;
  }

  private getFrontendUrl() {
    return (this.config.get<string>('FRONTEND_URL') ?? this.config.get<string>('CORS_ORIGIN') ?? 'https://localhost:8443').replace(/\/$/, '');
  }

  private normalizeUsername(value: string) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    return normalized || 'player';
  }

  private normalizeEmail(value: unknown) {
    return String(value).trim().toLowerCase();
  }

  private toBase64Url(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private getCredential(name: string) {
    const value = this.config.get<string>(name)?.trim();
    if (!value || /^your-.+-(id|secret)$/i.test(value)) {
      return undefined;
    }
    return value;
  }

  private constantTimeEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
