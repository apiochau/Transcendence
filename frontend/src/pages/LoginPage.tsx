import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, verifyTwoFactor} from '../api/auth';
import { getApiErrorMessage } from '../api/error';
import { OAuthButtons } from '../components/OAuthButtons';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await login({
        email: String(form.get('email')),
        password: String(form.get('password')),
      });
      if ('requires2FA' in response && response.requires2FA) {
        setTempToken(response.tempToken);
      } else if ('accessToken' in response) {
        setSession(response.accessToken, response.user);
      navigate('/dashboard');
      }
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Email ou mot de passe invalide.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmitTOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await verifyTwoFactor(tempToken!, String(form.get('code')));
      setSession(response.accessToken, response.user);
      navigate('/dashboard');
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Input 2FA invalide.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (tempToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-panel px-4">
        <form onSubmit={onSubmitTOTP} autoComplete="off" className="card-surface page-enter w-full max-w-md p-6">
          <h1 className="text-2xl font-bold">Vérification en deux étapes</h1>
          <p className="mt-2 text-sm text-slate-400">
            Entrez le code généré par votre application d'authentification.
          </p>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="motion-button mt-6 w-full rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? 'Vérification...' : 'Vérifier'}
            </button>
        </form>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <form onSubmit={onSubmit} className="card-surface page-enter w-full max-w-md p-6">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <label className="mt-6 block text-sm font-medium">Email</label>
        <input name="email" type="email" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
        <label className="mt-4 block text-sm font-medium">Mot de passe</label>
        <input name="password" type="password" required minLength={8} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="motion-button mt-6 w-full rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? 'Connexion...' : 'Se connecter'}
        </button>
        <OAuthButtons label="Se connecter" />
        <p className="mt-4 text-sm text-slate-600">Pas encore de compte ? <Link className="font-semibold text-accent transition hover:text-teal-300" to="/register">S'inscrire</Link></p>
      </form>
    </main>
  );
}
