import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getApiErrorMessage } from '../api/error';

interface MatchResult {
  roomId: string;
  players: string[];
  createdAt: string;
}

interface MatchmakingResponse {
  status: 'idle' | 'queued' | 'matched';
  match?: MatchResult;
  entry?: {
    userId: string;
    joinedAt: string;
  };
}

export function MatchmakingPage() {
  const navigate = useNavigate();
  const [queued, setQueued] = useState(false);
  const [message, setMessage] = useState('Pret a chercher un adversaire.');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function openMatch(match: MatchResult) {
    await apiClient.post('/matchmaking/consume');
    navigate(`/game/${encodeURIComponent(match.roomId)}`);
  }

  async function toggleQueue() {
    setError(null);
    setIsSubmitting(true);

    try {
      if (queued) {
        await apiClient.delete('/matchmaking/queue');
        setQueued(false);
        setMessage('Recherche annulee.');
        return;
      }

      const { data } = await apiClient.post<MatchmakingResponse>('/matchmaking/queue');
      if (data.status === 'matched' && data.match) {
        setMessage('Match trouve. Ouverture de la partie...');
        await openMatch(data.match);
        return;
      }

      setQueued(true);
      setMessage('Recherche en cours... Ouvre un deuxieme onglet avec un autre compte pour tester.');
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Impossible de rejoindre la file de matchmaking.'));
    } finally {
      setIsSubmitting(false);
    }
  }

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
    <section>
      <h1 className="text-3xl font-bold">Matchmaking</h1>
      <p className="mt-2 text-slate-600">Cherche un adversaire connecte avec un autre compte.</p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Etat</p>
        <p className="mt-2 text-lg font-semibold">{message}</p>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={toggleQueue}
          disabled={isSubmitting}
          className="mt-6 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {queued ? 'Quitter la recherche' : isSubmitting ? 'Recherche...' : 'Chercher une partie'}
        </button>
      </div>
    </section>
  );
}
