import { useEffect, useState } from 'react';
import { getOAuthLoginUrl, getOAuthProviders, OAuthProvider } from '../api/auth';

interface OAuthButtonsProps {
  label: string;
}

const DEFAULT_OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: '42', label: '42', enabled: false },
  { id: 'github', label: 'GitHub', enabled: false },
  { id: 'google', label: 'Google', enabled: false },
];

function mergeOAuthProviders(remoteProviders: OAuthProvider[]) {
  return DEFAULT_OAUTH_PROVIDERS.map((provider) => {
    const remoteProvider = remoteProviders.find((candidate) => candidate.id === provider.id);
    return remoteProvider ?? provider;
  });
}

export function OAuthButtons({ label }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>(DEFAULT_OAUTH_PROVIDERS);

  useEffect(() => {
    getOAuthProviders()
      .then((response) => setProviders(mergeOAuthProviders(response)))
      .catch(() => setProviders(DEFAULT_OAUTH_PROVIDERS));
  }, []);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">OAuth</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="mt-4 grid gap-2">
        {providers.map((provider) => {
          const content = (
            <span className="flex items-center justify-between gap-3">
              <span>{label} avec {provider.label}</span>
              {!provider.enabled && <span className="text-xs font-medium text-slate-400">Non configure</span>}
            </span>
          );

          if (!provider.enabled) {
            return (
              <span
                key={provider.id}
                aria-disabled="true"
                title={`${provider.label} OAuth n'est pas encore configure localement`}
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
              >
                {content}
              </span>
            );
          }

          return (
            <a
              key={provider.id}
              href={getOAuthLoginUrl(provider.id)}
              className="motion-button rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
            >
              {content}
            </a>
          );
        })}
      </div>
    </div>
  );
}
