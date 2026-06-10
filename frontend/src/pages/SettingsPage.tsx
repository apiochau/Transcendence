import { FormEvent, useEffect, useState } from 'react';
import { disable2FA, enable2FA, setup2FA } from '../api/auth';
import { getApiErrorMessage } from '../api/error';
import { apiClient } from '../api/client';

export function SettingsPage() {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [step, setStep] = useState<'idle' | 'setup' | 'disable'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
  apiClient.get<{ twoFactorEnabled: boolean }>('/auth/me')
    .then(({ data }) => {
      setTwoFactorEnabled(data.twoFactorEnabled);
    });
}, []);

    async function handleSetupStart() {
        setError(null);
        setIsLoading(true);
        try {
            const { qrCodeDataUrl } = await setup2FA();
            setQrCodeDataUrl(qrCodeDataUrl);
            setStep('setup');
        } catch (e) {
            setError(getApiErrorMessage(e, 'Erreur lors de la configuration.'));
        } finally {
            setIsLoading(false);
        }
    }

    async function handleEnable(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsLoading(true);
        const form = new FormData(event.currentTarget);
        try {
            const code = String(form.get('code'));
            await enable2FA(code);
            setTwoFactorEnabled(true);
            setStep('idle');
            setQrCodeDataUrl(null);
        } catch(e) {
            setError(getApiErrorMessage(e, 'Erreur lors de la configuration.'));
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDisable(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsLoading(true);
        const form = new FormData(event.currentTarget);
        try {
            const code = String(form.get('code'));
            await disable2FA(code);
            setTwoFactorEnabled(false);
            setStep('idle');
            setQrCodeDataUrl(null);
        } catch(e) {
            setError(getApiErrorMessage(e, 'Erreur lors de la configuration.'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="page-enter mx-auto max-w-lg">
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <section className="card-surface mt-6 p-6">
                <h2 className="text-lg font-semibold">Double authentification (2FA)</h2>
                {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                {step === 'idle' && (
                    <div className="mt-4">
                        {twoFactorEnabled ? (
                            <button
                                type="button"
                                onClick={() => { setStep('disable'); setError(null); }}
                                className="motion-button rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/30"
                            >
                                Désactiver la 2FA
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSetupStart}
                                disabled={isLoading}
                                className="motion-button rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
                            >
                                {isLoading ? 'Chargement...' : 'Activer la 2FA'}
                            </button>
                        )}
                    </div>
                )}
                {step === 'setup' && qrCodeDataUrl && (
                    <div className="mt-4">
                        <p className="text-sm text-slate-300">Scannez ce QR code avec Google Authenticator.</p>
                        <img src={qrCodeDataUrl} alt="QR Code 2FA" className="mt-3 rounded-md border border-slate-700" />
                        <form onSubmit={handleEnable} className="mt-4 flex gap-2">
                            <input name="code" type="text" required minLength={6} className="w-32 rounded-md border border-slate-300 px-3 py-2"/>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="motion-button rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
                                >
                                {isLoading ? '...' : 'Confirmer'}
                            </button>
                        </form>
                    </div>
                )}
                {step === 'disable'  && (
                    <div className="mt-4">
                        <p className="text-sm text-slate-300">Entrez votre code généré par l'appli pour désactiver la 2FA</p>
                        <form onSubmit={handleDisable} className="mt-4 flex gap-2">
                            <input name="code" type="text" required minLength={6} className="w-32 rounded-md border border-slate-300 px-3 py-2"/>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="motion-button rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:bg-red-700"
                                >
                                {isLoading ? '...' : 'Confirmer'}
                            </button>
                        </form>
                    </div>
                )}
            </section>
        </div>
    );
}