import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { AuthUser } from '../types/auth';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(searchParams.get('error') ?? '');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('accessToken');
    const userPayload = hashParams.get('user');

    if (!accessToken || !userPayload) {
      if (!error) {
        setError('Connexion OAuth impossible.');
      }
      return;
    }

    try {
      const user = JSON.parse(userPayload) as AuthUser;
      setSession(accessToken, user);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Reponse OAuth invalide.');
    }
  }, [error, navigate, setSession]);

  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <section className="card-surface page-enter w-full max-w-md p-6">
        <h1 className="text-2xl font-bold">Connexion OAuth</h1>
        {error ? (
          <>
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            <Link className="mt-6 inline-flex rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-teal-800" to="/login">
              Retour connexion
            </Link>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Connexion en cours...</p>
        )}
      </section>
    </main>
  );
}
