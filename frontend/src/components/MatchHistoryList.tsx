import { useEffect, useState } from 'react';
import { getMatchHistory, MatchHistoryEntry } from '../api/users';

export function MatchHistoryList({ userId }: { userId: string}) {
    const [history, setHistory] = useState<MatchHistoryEntry[]>([]);

    useEffect(() =>  {
        getMatchHistory(userId).then(setHistory);
    }, [userId]);

    if (history.length === 0) {
        return <p className="mt-4 text-sm text-slate-500">Aucune partie jouée.</p>;
    }

    return (
        <div className="mt-6">
            <h2 className="font-semibold text-slate-700">Historique des parties</h2>
            <ul className="mt-3 grid gap-2">
                {history.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3 text-sm">
                        <span className="font-medium">
                            {entry.opponent?.displayName ?? entry.opponent?.username ?? 'Inconnu'}
                        </span>
                        <span className={
                            entry.result === 'win' ? 'font-semibold text-green-600' :
                            entry.result === 'loss' ? 'font-semibold text-red-500' :
                            'font-semibold text-slate-500'
                        }>
                            {entry.result === 'win' ? 'Victoire' : entry.result === 'loss' ? 'Défaite' : 'Égalité'}
                        </span>
                        <span className="text-slate-400">
                            {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}