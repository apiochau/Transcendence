import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getApiErrorMessage } from '../api/error';

type Tab = 'friends' | 'pending' | 'sent';

interface FriendUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface FriendshipRow {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: string;
  requesterId: string;
  friend: FriendUser;
  isIncoming: boolean;
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

function Avatar({ user, size = 'h-9 w-9' }: { user: { avatarUrl: string | null; username: string; displayName: string | null }; size?: string }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${size} rounded-full border border-slate-200 object-cover`} />;
  }
  return (
    <div className={`${size} flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500`}>
      {(user.displayName ?? user.username).charAt(0).toUpperCase()}
    </div>
  );
}

export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [rows, setRows] = useState<FriendshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      setError(null);
      const { data } = await apiClient.get<any>('/friends');
      setRows(Array.isArray(data) ? data : data.friends ?? data.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Impossible de charger la liste d amis.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  const accepted = rows.filter((r) => r.status === 'ACCEPTED');
  const pendingIncoming = rows.filter((r) => r.status === 'PENDING' && r.isIncoming);
  const pendingSent = rows.filter((r) => r.status === 'PENDING' && !r.isIncoming);

  const tabCounts: Record<Tab, number> = {
    friends: accepted.length,
    pending: pendingIncoming.length,
    sent: pendingSent.length,
  };

  const displayed = tab === 'friends' ? accepted : tab === 'pending' ? pendingIncoming : pendingSent;

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setSearchError(null);
        const { data } = await apiClient.get<SearchResult[]>('/users/search', {
          params: { q: searchQuery.trim() },
        });
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (e) {
        setSearchError(getApiErrorMessage(e, 'Erreur lors de la recherche.'));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  async function sendRequest(username: string) {
    setActionError(null);
    try {
      await apiClient.post('/friends/requests', { username });
      setRequestSent((prev) => new Set(prev).add(username));
      void loadFriends();
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Impossible d envoyer la demande.'));
    }
  }

  async function acceptRequest(friendshipId: string) {
    setActionError(null);
    try {
      await apiClient.patch(`/friends/${friendshipId}/accept`);
      void loadFriends();
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Impossible d accepter la demande.'));
    }
  }

  async function removeFriendship(friendshipId: string) {
    setActionError(null);
    try {
      await apiClient.delete(`/friends/${friendshipId}`);
      setRows((prev) => prev.filter((r) => r.id !== friendshipId));
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Impossible de supprimer.'));
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'friends', label: 'Amis' },
    { key: 'pending', label: 'Recues' },
    { key: 'sent', label: 'Envoyees' },
  ];

  return (
    <section>
      <h1 className="text-3xl font-bold">Amis</h1>
      <p className="mt-2 text-slate-600">Cherche un joueur avec son pseudo pour l ajouter en ami.</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-600">Ajouter un ami</label>
        <input
          type="text"
          placeholder="Rechercher par pseudo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2 w-full rounded-md border border-slate-200 px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
        />
        {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}
        {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}

        {searchQuery.trim().length > 3 && (
          <div className="mt-3 space-y-2">
            {searching && <p className="text-sm text-slate-500">Recherche...</p>}
            {!searching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
              <p className="text-sm text-slate-500">Aucun joueur trouve.</p>
            )}
            {searchResults.map((user) => {
              const alreadyFriend = rows.some(
                (r) => r.friend.id === user.id && (r.status === 'ACCEPTED' || r.status === 'PENDING'),
              );
              const justSent = requestSent.has(user.username);
              return (
                <div key={user.id} className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3">
                  <Link
                    to={`/profile/${user.id}`}
                    className="flex items-center gap-3 hover:opacity-80"
                  >
                    <Avatar user={{ ...user, displayName: user.displayName }} />
                    <div>
                      <p className="text-sm font-semibold">{user.displayName ?? user.username}</p>
                      <p className="text-xs text-slate-500">@{user.username}</p>
                    </div>
                  </Link>
                  {alreadyFriend ? (
                    <span className="text-xs font-medium text-slate-400">Deja ami / en attente</span>
                  ) : justSent ? (
                    <span className="text-xs font-medium text-green-700">Demande envoyee</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void sendRequest(user.username)}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      Ajouter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-8 flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-white text-accent shadow-sm' : 'text-slate-600 hover:text-ink'
            }`}
          >
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs ${
                tab === t.key ? 'bg-teal-100 text-accent' : 'bg-slate-200 text-slate-600'
              }`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Chargement...</p>
        ) : displayed.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {tab === 'friends' && 'Aucun ami pour le moment.'}
            {tab === 'pending' && 'Aucune demande en attente.'}
            {tab === 'sent' && 'Aucune demande envoyee.'}
          </p>
        ) : (
          displayed.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <Link
                to={`/profile/${row.friend.id}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <Avatar user={row.friend} />
                <div>
                  <p className="text-sm font-semibold">{row.friend.displayName ?? row.friend.username}</p>
                  <p className="text-xs text-slate-500">@{row.friend.username}</p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {tab === 'pending' && (
                  <button
                    type="button"
                    onClick={() => void acceptRequest(row.id)}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    Accepter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void removeFriendship(row.id)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-700"
                >
                  {tab === 'friends' ? 'Retirer' : tab === 'pending' ? 'Refuser' : 'Annuler'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}