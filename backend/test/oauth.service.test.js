const assert = require('node:assert/strict');
const test = require('node:test');
const { OAuthService } = require('../dist/auth/oauth.service');

const credentials = {
  JWT_SECRET: 'test-jwt-secret',
  FRONTEND_URL: 'https://localhost:8443',
  OAUTH_CALLBACK_BASE_URL: 'https://localhost:8443/api',
  OAUTH_GOOGLE_CLIENT_ID: 'google-client',
  OAUTH_GOOGLE_CLIENT_SECRET: 'google-secret',
  OAUTH_GITHUB_CLIENT_ID: 'github-client',
  OAUTH_GITHUB_CLIENT_SECRET: 'github-secret',
  OAUTH_42_CLIENT_ID: '42-client',
  OAUTH_42_CLIENT_SECRET: '42-secret',
};

function createService(onLogin = async (profile) => ({ accessToken: 'jwt', user: profile })) {
  return new OAuthService(
    { get: (name) => credentials[name] },
    { loginWithOAuth: onLogin },
  );
}

test('exposes all configured OAuth providers and exact public callbacks', () => {
  const service = createService();
  assert.deepEqual(service.listProviders(), [
    { id: 'google', label: 'Google', enabled: true },
    { id: 'github', label: 'GitHub', enabled: true },
    { id: '42', label: '42', enabled: true },
  ]);

  for (const provider of ['google', 'github', '42']) {
    const authorization = service.getAuthorizationRequest(provider);
    const url = new URL(authorization.url);
    assert.equal(url.searchParams.get('client_id'), credentials[`OAUTH_${provider === '42' ? '42' : provider.toUpperCase()}_CLIENT_ID`]);
    assert.equal(url.searchParams.get('redirect_uri'), `https://localhost:8443/api/auth/oauth/${provider}/callback`);
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('state'), authorization.state);
  }
});

test('completes Google, GitHub and 42 authorization-code flows', async () => {
  const originalFetch = global.fetch;
  const profiles = [];
  const service = createService(async (profile) => {
    profiles.push(profile);
    return { accessToken: 'jwt', user: profile };
  });

  const providerResponses = {
    google: [{ access_token: 'google-token' }, {
      id: 'g-1', email: 'Google@Example.com', verified_email: true, name: 'Google User', picture: 'https://example.com/google.png',
    }],
    github: [{ access_token: 'github-token' }, {
      id: 2, login: 'octocat', email: null, name: 'Octo Cat', avatar_url: 'https://example.com/github.png',
    }, [{ email: 'github@example.com', primary: true, verified: true }]],
    42: [{ access_token: '42-token' }, {
      id: 3, email: 'student@student.42.fr', login: 'student', displayname: '42 Student', image: { link: 'https://example.com/42.png' },
    }],
  };

  try {
    for (const provider of ['google', 'github', '42']) {
      const responses = [...providerResponses[provider]];
      global.fetch = async () => new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      const authorization = service.getAuthorizationRequest(provider);
      await service.completeLogin(provider, 'authorization-code', authorization.state, authorization.state);
    }
  } finally {
    global.fetch = originalFetch;
  }

  assert.deepEqual(profiles.map(({ provider, providerUserId, email }) => ({ provider, providerUserId, email })), [
    { provider: 'google', providerUserId: 'g-1', email: 'google@example.com' },
    { provider: 'github', providerUserId: '2', email: 'github@example.com' },
    { provider: '42', providerUserId: '3', email: 'student@student.42.fr' },
  ]);
});

test('rejects an OAuth callback not bound to the initiating browser', async () => {
  const service = createService();
  const authorization = service.getAuthorizationRequest('google');
  await assert.rejects(
    service.completeLogin('google', 'code', authorization.state, undefined),
    /Invalid OAuth state/,
  );
});
