import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { getApiErrorMessage } from '../api/error';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setSession(response.accessToken, response.user);
      navigate('/dashboard');
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Email ou mot de passe invalide.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Login</h1>
        <label className="mt-6 block text-sm font-medium">Email</label>
        <input name="email" type="email" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input name="password" type="password" required minLength={8} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? 'Connexion...' : 'Sign in'}
        </button>
        <p className="mt-4 text-sm text-slate-600">No account? <Link className="font-semibold text-accent" to="/register">Register</Link></p>
      </form>
    </main>
  );
}
