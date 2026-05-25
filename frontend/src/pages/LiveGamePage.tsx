import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../api/socket';

export function LiveGamePage() {
  const { roomId = 'lobby' } = useParams();

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit('room:join', { roomId });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.disconnect();
    };
  }, [roomId]);

  return (
    <section>
      <h1 className="text-3xl font-bold">Live Game</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Room</p>
          <p className="mt-2 break-all text-xl font-bold">{roomId}</p>
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Players</h2>
          <p className="mt-2 text-sm text-slate-600">Socket room membership is ready for live game events.</p>
        </aside>
      </div>
    </section>
  );
}
