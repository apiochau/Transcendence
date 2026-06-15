import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { MatchHistoryList } from '../components/MatchHistoryList';
import { useAuthStore } from '../store/auth.store';
import { getMyProfile, PublicProfile, updateMyProfile, uploadAvatar } from '../api/users';

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, setSession, accessToken } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    setProfile(null);
    setEditing(false);
    setError(null);

    if (isOwnProfile) {
      void getMyProfile().then(setProfile);
      return;
    }

    void apiClient.get<PublicProfile>(`/users/${userId}`).then(({ data }) => setProfile(data));
  }, [userId, isOwnProfile]);

  function startEdit() {
    setDisplayName(profile?.displayName ?? '');
    setEditing(true);
    setError(null);
  }

  async function save() {
    if (!accessToken || !user) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyProfile({ displayName: displayName.trim() || undefined });
      setProfile((prev) => prev ? { ...prev, displayName: updated.displayName } : prev);
      setSession(accessToken, updated);
      setEditing(false);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken || !user) return;

    try {
      const updated = await uploadAvatar(file);
      setProfile((prev) => prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev);
      setSession(accessToken, updated);
    } catch {
      setError('Erreur lors du telechargement.');
    } finally {
      event.target.value = '';
    }
  }

  const avatarLetter = (profile?.displayName ?? profile?.username ?? '?')[0].toUpperCase();

  return (
    <section className="page-enter">
      <h1 className="text-3xl font-bold">
        {isOwnProfile ? 'Profil' : `Profil de ${profile?.username ?? ''}`}
      </h1>

      <div className="card-surface mt-8 p-6">
        <div className="flex items-center gap-5">
          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-20 w-20 overflow-hidden rounded-full"
              title="Changer l'avatar"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
                  {avatarLetter}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                <span className="text-xs font-semibold text-white">Modifier</span>
              </div>
            </button>
          ) : (
            <div className="h-20 w-20 overflow-hidden rounded-full">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
                  {avatarLetter}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div>
            <p className="text-xl font-bold">{profile?.displayName ?? profile?.username}</p>
            <p className="text-sm text-slate-500">@{profile?.username}</p>
            {isOwnProfile && (
              <p className="text-sm text-slate-500">{profile?.email ?? user?.email}</p>
            )}
          </div>
        </div>

        {profile?.stats && (
          <div className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4 text-center">
            <div>
              <p className="text-2xl font-bold">{profile.stats.wins}</p>
              <p className="text-xs text-slate-500">Victoires</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{profile.stats.losses}</p>
              <p className="text-xs text-slate-500">Defaites</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{profile.collectionValue}</p>
              <p className="text-xs text-slate-500">Valeur collection</p>
            </div>
          </div>
        )}

        {profile?.id && <MatchHistoryList userId={profile.id} />}

        {isOwnProfile && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="motion-button mt-6 rounded-md bg-accent px-5 py-2 font-semibold text-white hover:bg-teal-800"
          >
            Modifier le profil
          </button>
        )}

        {isOwnProfile && editing && (
          <div className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-600">
              Nom affiche
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={40}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving || displayName.trim() === ''}
                className="motion-button rounded-md bg-accent px-5 py-2 font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-slate-300 px-5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {error && !editing && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}
