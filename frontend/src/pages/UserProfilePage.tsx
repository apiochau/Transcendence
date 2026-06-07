import {useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, PublicProfile } from '../api/users';
import { useAuthStore } from '../store/auth.store'
import { MatchHistoryList } from '../components/MatchHistoryList';

export function UserProfilePage() {
    const { id } = useParams<{ id: string }>();
    const currentUser = useAuthStore((state) => state.user);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        getUserProfile(id)
            .then(setProfile)
            .catch(() => setNotFound(true));
    }, [id]);

    if (notFound) {
        return (
            <section className="page-enter">
                <h1 className="text-3xl font-bold">Utilisateur introuvable</h1>
            </section>
        );
    }

    const avatarLetter = (profile?.displayName ?? profile?.username ?? '?')[0].toUpperCase();
    const isOwnProfile = currentUser?.id === id;

    return (
        <section className="page-enter">
            <h1 className="text-3xl font-bold">
                {profile?.displayName ?? profile?.username ?? '...'}
            </h1>

            <div className="card-surface mt-8 p-6">
                <div className="flex items-center gap-5">
                    {profile?.avatarUrl ? (
                        <img
                            src={profile.avatarUrl}
                            alt="avatar"
                            className="h-20 w-20 rounded-full object-cover"
                            />
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
                            {avatarLetter}
                            </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-xl font-bold">{profile?.displayName ?? profile?.username}</p>
                            {profile && (
                                profile?.isOnline
                                ? <span className="h-2.5 w-2.5 rounded-full bg-green-500" title="En ligne" />
                                : <span className="h-2.5 w-2.5 rounded-full bg-slate-300" title="Hors ligne" />
                            )}
                        </div>
                        <p className="text-sm text-slate-500">@{profile?.username}</p>
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
                            <p className="text-xs text-slate-500">Défaites</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{profile.collectionValue}</p>
                            <p className="text-xs text-slate-500">Valeur collection</p>
                        </div>
                    </div>
                )}

                <MatchHistoryList userId={id ?? ''} />
                
                {!isOwnProfile && (
                    <button
                        type="button"
                        className="motion-button mt-6 rounded-md bg-accent px-5 py-2 font-semibold text-white hover:bg-teal-800"
                        >
                            + Ajouter en ami
                        </button>
                )}
            </div>
        </section>
    );
}
