export type OAuthProviderId = 'google' | 'github' | '42';

export interface OAuthProviderConfig {
  id: OAuthProviderId;
  label: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  profileUrl: string;
  emailsUrl?: string;
  scopes: string[];
}

export interface RemoteOAuthProfile {
  provider: OAuthProviderId;
  providerUserId: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}
