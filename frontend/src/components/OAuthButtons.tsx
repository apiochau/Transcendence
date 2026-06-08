import { useEffect, useState } from 'react';
import { getOAuthLoginUrl, getOAuthProviders, OAuthProvider } from '../api/auth';

interface OAuthButtonsProps {
  label: string;
}

export function OAuthButtons({ label }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    getOAuthProviders()
      .then((response) => setProviders(response.filter((provider) => provider.enabled)))
      .catch(() => setProviders([]));
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
        {providers.map((provider) => (
          <a
            key={provider.id}
            href={getOAuthLoginUrl(provider.id)}
            className="motion-button rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-semibold hover:border-accent hover:text-accent"
          >
            {label} avec {provider.label}
          </a>
        ))}
      </div>
    </div>
  );
}
