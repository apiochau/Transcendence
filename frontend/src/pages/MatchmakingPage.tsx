import { useState } from 'react';
import { apiClient } from '../api/client';

export function MatchmakingPage() {
  const [queued, setQueued] = useState(false);

  async function toggleQueue() {
    if (queued) {
      await apiClient.delete('/matchmaking/queue');
      setQueued(false);
      return;
    }

    await apiClient.post('/matchmaking/queue');
    setQueued(true);
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">Matchmaking</h1>
      <p className="mt-2 text-slate-600">Queue state is wired for the backend service and websocket flow.</p>
      <button type="button" onClick={toggleQueue} className="mt-8 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800">
        {queued ? 'Leave queue' : 'Join queue'}
      </button>
    </section>
  );
}
