import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CollectionItem, getMyCollection } from '../api/collection';
import { getApiErrorMessage } from '../api/error';

type MatchmakingMode = 'daily' | 'training' | 'duel';

interface MatchResult {
  roomId: string;
  mode: MatchmakingMode;
  players: string[];
  createdAt: string;
}

interface MatchmakingResponse {
  status: 'idle' | 'queued' | 'matched';
  match?: MatchResult;
  entry?: {
    userId: string;
    mode: MatchmakingMode;
    joinedAt: string;
    stakeWordText?: string;
    stakeRarity?: string;
  };
}

interface DailyStatus {
  dayKey: string;
  available: boolean;
  usedAt: string | null;
  nextAvailableAt: string | null;
}

const modes: Array<{
  id: MatchmakingMode;
  title: string;
  label: string;
  body: string;
}> = [
  {
    id: 'daily',
    title: 'Daily',
    label: '1 fois par jour',
    body: 'Match quotidien avec recompense de mot pour la collection.',
  },
  {
    id: 'training',
    title: 'Training',
    label: 'Casual',
    body: 'Match en ligne libre, sans gain ni perte de mot.',
  },
  {
    id: 'duel',
    title: 'Duel',
    label: 'Mise de mot',
    body: 'Mise un mot. Trouve celui de l adversaire pour gagner les deux mises.',
  },
];

const rarityLabels: Record<string, string> = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Epique',
  legendary: 'Legendaire',
};

export function MatchmakingPage() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<MatchmakingMode>('training');
  const [queued, setQueued] = useState(false);
  const [message, setMessage] = useState('Choisis un mode de jeu.');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [dailyRemainingMs, setDailyRemainingMs] = useState(0);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [selectedStakeItemId, setSelectedStakeItemId] = useState<string>('');
  const [selectedStakeSnapshot, setSelectedStakeSnapshot] = useState<CollectionItem | null>(null);

  const selectedStakeItem = useMemo(
    () => collectionItems.find((item) => item.id === selectedStakeItemId) ?? selectedStakeSnapshot,
    [collectionItems, selectedStakeItemId, selectedStakeSnapshot],
  );
  const canStartSelectedMode = selectedMode !== 'daily' || dailyStatus?.available === true;

  async function openMatch(match: MatchResult) {
    await apiClient.post('/matchmaking/consume');
    navigate(`/game/${encodeURIComponent(match.roomId)}`);
  }

  async function refreshModeData(preserveMissingStake = queued) {
    const [dailyResponse, collection] = await Promise.all([
      apiClient.get<DailyStatus>('/matchmaking/daily/status'),
      getMyCollection(),
    ]);
    setDailyStatus(dailyResponse.data);
    setCollectionItems(collection.items);
    setSelectedStakeItemId((currentStakeItemId) => {
      if (collection.items.some((item) => item.id === currentStakeItemId)) {
        return currentStakeItemId;
      }

      if (preserveMissingStake && currentStakeItemId) {
        return currentStakeItemId;
      }

      return collection.items[0]?.id ?? '';
    });
    setSelectedStakeSnapshot((currentSnapshot) => {
      if (!preserveMissingStake) {
        return null;
      }

      const freshItem = collection.items.find((item) => item.id === selectedStakeItemId);
      if (freshItem) {
        return freshItem;
      }

      return currentSnapshot;
    });
  }

  async function refreshQueueStatus() {
    const { data } = await apiClient.get<MatchmakingResponse>('/matchmaking/status');
    if (data.status === 'matched' && data.match) {
      setMessage('Match trouve. Ouverture de la partie...');
      await openMatch(data.match);
      return;
    }

    if (data.status === 'queued' && data.entry) {
      setQueued(true);
      setSelectedMode(data.entry.mode);
      setMessage(getQueuedMessage(data.entry.mode, data.entry.stakeWordText, data.entry.stakeRarity));
      return;
    }

    setQueued(false);
  }

  async function toggleQueue() {
    setError(null);
    setIsSubmitting(true);

    try {
      if (queued) {
        await apiClient.delete('/matchmaking/queue');
        setQueued(false);
        setMessage('Recherche annulee.');
        await refreshModeData(false);
        return;
      }

      if (selectedMode === 'daily' && dailyStatus?.available !== true) {
        setError('Daily deja joue aujourd hui.');
        await refreshModeData(false);
        return;
      }

      if (selectedMode === 'duel' && !selectedStakeItemId) {
        setError('Choisis un mot a mettre en jeu pour lancer un Duel.');
        return;
      }

      const stakeSnapshotBeforeQueue = selectedMode === 'duel' ? selectedStakeItem : null;
      const { data } = await apiClient.post<MatchmakingResponse>('/matchmaking/queue', {
        mode: selectedMode,
        stakeCollectionItemId: selectedMode === 'duel' ? selectedStakeItemId : undefined,
      });

      if (data.status === 'matched' && data.match) {
        setMessage('Match trouve. Ouverture de la partie...');
        await openMatch(data.match);
        return;
      }

      setQueued(true);
      if (stakeSnapshotBeforeQueue) {
        setSelectedStakeSnapshot(stakeSnapshotBeforeQueue);
      }
      setMessage(getQueuedMessage(data.entry?.mode ?? selectedMode, data.entry?.stakeWordText, data.entry?.stakeRarity));
      await refreshModeData(true);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Impossible de rejoindre la file de matchmaking.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    Promise.all([refreshModeData(), refreshQueueStatus()]).catch((caughtError) => {
      setError(getApiErrorMessage(caughtError, 'Impossible de charger les modes de jeu.'));
    });
  }, []);

  useEffect(() => {
    if (!dailyStatus?.nextAvailableAt) {
      setDailyRemainingMs(0);
      return undefined;
    }

    const updateRemaining = () => {
      setDailyRemainingMs(Math.max(0, new Date(dailyStatus.nextAvailableAt ?? '').getTime() - Date.now()));
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [dailyStatus?.nextAvailableAt]);

  useEffect(() => {
    if (!queued) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const { data } = await apiClient.get<MatchmakingResponse>('/matchmaking/status');
        if (data.status === 'matched' && data.match) {
          setMessage('Match trouve. Ouverture de la partie...');
          setQueued(false);
          await openMatch(data.match);
        }
      } catch (caughtError) {
        setError(getApiErrorMessage(caughtError, 'Impossible de verifier le matchmaking.'));
      }
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [queued]);

  return (
    <section className="page-enter">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Matchmaking</p>
      <h1 className="mt-2 text-3xl font-bold">Choisir un mode</h1>
      <p className="mt-2 text-slate-600">Daily, Training ou Duel avec mise de collection.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {modes.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const isDailyLocked = mode.id === 'daily' && dailyStatus?.available === false;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                if (!queued) {
                  setSelectedMode(mode.id);
                  setMessage(`${mode.title} selectionne.`);
                }
              }}
              disabled={queued}
              className={`interactive-card rounded-md border p-5 text-left disabled:cursor-not-allowed disabled:opacity-75 ${
                isSelected ? 'border-accent bg-teal-950/30' : 'border-slate-700 bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">{mode.label}</p>
                  <h2 className="mt-3 text-2xl font-black">{mode.title}</h2>
                </div>
                {isDailyLocked && <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">Utilise</span>}
              </div>
              <p className="mt-3 text-sm text-slate-500">{mode.body}</p>
            </button>
          );
        })}
      </div>

      {selectedMode === 'duel' && (
        <div className="panel-surface mt-6 p-6">
          <h2 className="text-xl font-bold">Mot mis en jeu</h2>
          <p className="mt-2 text-sm text-slate-500">
            Le matchmaking te placera contre un joueur qui mise un mot de meme rarete.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {collectionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedStakeItemId(item.id);
                  setSelectedStakeSnapshot(item);
                }}
                disabled={queued}
                className={`interactive-card rounded-md border p-4 text-left disabled:cursor-not-allowed disabled:opacity-70 ${
                  selectedStakeItemId === item.id ? 'border-amber-400 bg-amber-950/30' : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">{item.text}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {rarityLabels[item.rarity] ?? item.rarity}
                    </p>
                  </div>
                  <p className="font-black text-accent">{item.value}</p>
                </div>
              </button>
            ))}
            {collectionItems.length === 0 && (
              <p className="rounded-md border border-slate-700 bg-slate-900 p-4 text-sm text-slate-500">
                Tu dois posseder au moins un mot pour lancer un Duel.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card-surface mt-8 p-6">
        <p className="text-sm font-medium text-slate-500">Etat</p>
        <div className="mt-2 flex items-center gap-3">
          {queued && <span className="status-dot" />}
          <p className="text-lg font-semibold">{message}</p>
        </div>
        {selectedMode === 'daily' && dailyStatus?.available === false && (
          <p className="mt-4 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-400">
            Daily deja joue aujourd hui. Prochain Daily dans{' '}
            <span className="font-black text-white">{formatRemainingTime(dailyRemainingMs)}</span>.
          </p>
        )}
        {selectedMode === 'duel' && selectedStakeItem && (
          <p className="mt-4 rounded-md border border-amber-400/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
            Mise selectionnee: {selectedStakeItem.text} ({rarityLabels[selectedStakeItem.rarity] ?? selectedStakeItem.rarity})
          </p>
        )}
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={toggleQueue}
          disabled={isSubmitting || (!queued && !canStartSelectedMode) || (!queued && selectedMode === 'duel' && !selectedStakeItemId)}
          className="motion-button mt-6 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {queued ? 'Quitter la recherche' : isSubmitting ? 'Recherche...' : `Chercher en ${getModeTitle(selectedMode)}`}
        </button>
      </div>
    </section>
  );
}

function getModeTitle(mode: MatchmakingMode) {
  if (mode === 'daily') {
    return 'Daily';
  }

  if (mode === 'duel') {
    return 'Duel';
  }

  return 'Training';
}

function getQueuedMessage(mode: MatchmakingMode, stakeWordText?: string, stakeRarity?: string) {
  if (mode === 'duel') {
    return `Recherche Duel avec mise ${stakeWordText ?? ''} (${rarityLabels[stakeRarity ?? ''] ?? stakeRarity ?? 'rarete inconnue'}).`;
  }

  return `Recherche ${getModeTitle(mode)} en cours...`;
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}
