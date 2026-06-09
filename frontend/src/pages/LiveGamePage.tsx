import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { createSocket } from '../api/socket';
import { useAuthStore } from '../store/auth.store';

type SimilarityBucket = 'hot' | 'warm' | 'cold' | 'frozen';

interface ReadyState {
  players: number;
  ready: number;
  started: boolean;
}

interface SuggestedWord {
  wordId: string;
  word: string;
}

interface RevealedSuggestion {
  wordId: string;
  word: string;
  score: number;
  bucket: SimilarityBucket;
  createdAt: string;
  cooldownMs?: number;
}

interface OpponentScore {
  rank: number;
  score: number;
  bucket: SimilarityBucket;
  createdAt: string;
}

interface OpponentState {
  opponentUserId?: string;
  topSuggestions: OpponentScore[];
  finalAttemptCount: number;
}

interface FinishedPlayerStats {
  userId: string;
  isWinner: boolean;
  selectedWordCount: number;
  finalAttemptCount: number;
  bestScore: number;
}

interface GameFinishedPayload {
  winnerUserId: string;
  loserUserId: string | null;
  mode: 'training' | 'daily' | 'duel';
  secretWord: string;
  collectionRewardWord: string | null;
  durationSeconds: number;
  players: FinishedPlayerStats[];
}

interface SessionStatePayload {
  started: boolean;
  finished: boolean;
  suggestions: SuggestedWord[];
  history: RevealedSuggestion[];
  cooldownMs: number;
  opponentState: OpponentState;
}

const bucketLabels: Record<SimilarityBucket, string> = {
  hot: 'Brulant',
  warm: 'Tiede',
  cold: 'Froid',
  frozen: 'Glace',
};

const bucketClasses: Record<SimilarityBucket, string> = {
  hot: 'border-red-400 bg-red-950/35 text-red-100',
  warm: 'border-amber-400 bg-amber-950/35 text-amber-100',
  cold: 'border-sky-400 bg-sky-950/35 text-sky-100',
  frozen: 'border-slate-500 bg-slate-900 text-slate-200',
};

const confettiPieces = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 41) % 100}%`,
  delay: `${(index % 8) * 0.14}s`,
  drift: `${index % 2 === 0 ? '-' : ''}${24 + (index % 5) * 10}px`,
  rotate: `${(index * 37) % 180}deg`,
  color: ['#14b8a6', '#f59e0b', '#22c55e', '#60a5fa', '#f43f5e'][index % 5],
}));

export function LiveGamePage() {
  const { roomId = 'lobby' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const socketRef = useRef<Socket | null>(null);
  const activeMatchRef = useRef(false);
  const pendingSuggestionTimeoutRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connexion...');
  const [events, setEvents] = useState<string[]>([]);
  const [readySent, setReadySent] = useState(false);
  const [readyState, setReadyState] = useState<ReadyState>({ players: 0, ready: 0, started: false });
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedWord[]>([]);
  const [lockedWordId, setLockedWordId] = useState<string | null>(null);
  const [revealedSuggestion, setRevealedSuggestion] = useState<RevealedSuggestion | null>(null);
  const [history, setHistory] = useState<RevealedSuggestion[]>([]);
  const [opponentState, setOpponentState] = useState<OpponentState>({ topSuggestions: [], finalAttemptCount: 0 });
  const [finalAnswer, setFinalAnswer] = useState('');
  const [finalMessage, setFinalMessage] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [winnerUserId, setWinnerUserId] = useState<string | null>(null);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [finishedStats, setFinishedStats] = useState<GameFinishedPayload | null>(null);
  const [showCollectionReward, setShowCollectionReward] = useState(false);

  const sortedHistory = useMemo(
    () => history.slice().sort((left, right) => right.score - left.score),
    [history],
  );
  const isWinner = finished && winnerUserId === user?.id;
  const isLoser = finished && winnerUserId !== null && winnerUserId !== user?.id;
  const waitingForNextSuggestions = Boolean(cooldownUntil && cooldownRemaining > 0);
  const myFinishedStats = finishedStats?.players.find((player) => player.userId === user?.id) ?? null;
  const opponentFinishedStats = finishedStats?.players.find((player) => player.userId !== user?.id) ?? null;
  const hasActiveMatch = started && !finished;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    hasActiveMatch && currentLocation.pathname !== nextLocation.pathname
  ));

  useEffect(() => {
    activeMatchRef.current = hasActiveMatch;
  }, [hasActiveMatch]);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return;
    }

    const shouldLeave = window.confirm('Quitter cette partie donnera la victoire a ton adversaire. Continuer ?');
    if (!shouldLeave) {
      blocker.reset();
      return;
    }

    socketRef.current?.emit('game:signal', { roomId, event: 'player:forfeit' });
    blocker.proceed();
  }, [blocker, roomId]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!activeMatchRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    function addEvent(message: string) {
      setEvents((currentEvents) => [message, ...currentEvents].slice(0, 8));
    }

    function scheduleNextSuggestions(cooldownMs: number) {
      if (pendingSuggestionTimeoutRef.current) {
        window.clearTimeout(pendingSuggestionTimeoutRef.current);
      }

      pendingSuggestionTimeoutRef.current = window.setTimeout(() => {
        socket.emit('game:signal', { roomId, event: 'suggestions:next' });
        pendingSuggestionTimeoutRef.current = null;
      }, cooldownMs + 150);
    }

    function onConnect() {
      setConnected(true);
      setConnectionStatus('Connecte');
      socket.emit('room:join', { roomId });
      addEvent('Room rejointe.');
    }

    function onDisconnect(reason: string) {
      setConnected(false);
      setConnectionStatus(`Deconnecte: ${reason}`);
      addEvent(`Socket deconnecte: ${reason}`);
    }

    function onConnectError(error: Error) {
      setConnected(false);
      setConnectionStatus(`Erreur socket: ${error.message}`);
      addEvent(`Erreur socket: ${error.message}`);
    }

    function onReadyState(payload: ReadyState) {
      setReadyState(payload);
    }

    function onGameStarted() {
      setStarted(true);
      setFinished(false);
      setWinnerUserId(null);
      setSecretWord(null);
      setFinishedStats(null);
      setReadySent(true);
      setSuggestions([]);
      setLockedWordId(null);
      setRevealedSuggestion(null);
      setHistory([]);
      setOpponentState({ topSuggestions: [], finalAttemptCount: 0 });
      setFinalMessage(null);
      setCooldownUntil(null);
      setCooldownRemaining(0);
      addEvent('Partie lancee.');
    }

    function onSuggestions(payload: { suggestions: SuggestedWord[] }) {
      setSuggestions(payload.suggestions);
      setLockedWordId(null);
      setRevealedSuggestion(null);
      setCooldownUntil(null);
      setCooldownRemaining(0);
      addEvent('Nouvelles suggestions disponibles.');
    }

    function onSessionState(payload: SessionStatePayload) {
      setStarted(payload.started && !payload.finished);
      setFinished(payload.finished);
      setSuggestions(payload.suggestions);
      setLockedWordId(payload.suggestions.length === 0 && payload.cooldownMs > 0 ? 'resume-lock' : null);
      setRevealedSuggestion(null);
      setHistory(payload.history);
      setOpponentState(payload.opponentState);
      setReadySent(payload.started);
      setFinalMessage(null);
      setCooldownUntil(payload.cooldownMs > 0 ? Date.now() + payload.cooldownMs : null);
      setCooldownRemaining(payload.cooldownMs > 0 ? Math.ceil(payload.cooldownMs / 1000) : 0);
      addEvent('Partie reprise.');

      if (payload.cooldownMs > 0) {
        scheduleNextSuggestions(payload.cooldownMs);
      }
    }

    function onSuggestionResult(payload: RevealedSuggestion) {
      setRevealedSuggestion(payload);
      setHistory((currentHistory) => [payload, ...currentHistory]);
      addEvent(`${payload.word}: ${payload.score}%`);

      if (payload.cooldownMs) {
        const nextCooldownUntil = Date.now() + payload.cooldownMs;
        setCooldownUntil(nextCooldownUntil);
        scheduleNextSuggestions(payload.cooldownMs);
      }
    }

    function onOpponentState(payload: OpponentState) {
      setOpponentState(payload);
    }

    function onFinalAnswerResult(payload: { success: boolean }) {
      if (!payload.success) {
        setFinalMessage('Rate. Le mot doit etre exactement le mot secret.');
      }
    }

    function onGameFinished(payload: GameFinishedPayload) {
      setFinished(true);
      setStarted(false);
      setWinnerUserId(payload.winnerUserId);
      setSecretWord(payload.secretWord);
      setFinishedStats(payload);
      setShowCollectionReward(Boolean(payload.collectionRewardWord));
      setReadySent(false);
      setSuggestions([]);
      setLockedWordId(null);
      setCooldownUntil(null);
      setCooldownRemaining(0);
      addEvent(payload.winnerUserId === user?.id ? 'Victoire.' : 'Defaite.');
    }

    function onGameError(payload: { message?: string; remainingMs?: number }) {
      if (payload.remainingMs) {
        setCooldownUntil(Date.now() + payload.remainingMs);
      }
      addEvent(payload.message ?? 'Erreur de partie.');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('game:ready-state', onReadyState);
    socket.on('game:started', onGameStarted);
    socket.on('game:session-state', onSessionState);
    socket.on('game:suggestions', onSuggestions);
    socket.on('game:suggestion-result', onSuggestionResult);
    socket.on('game:opponent-state', onOpponentState);
    socket.on('game:final-answer-result', onFinalAnswerResult);
    socket.on('game:finished', onGameFinished);
    socket.on('game:error', onGameError);
    socket.connect();

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('game:ready-state', onReadyState);
      socket.off('game:started', onGameStarted);
      socket.off('game:session-state', onSessionState);
      socket.off('game:suggestions', onSuggestions);
      socket.off('game:suggestion-result', onSuggestionResult);
      socket.off('game:opponent-state', onOpponentState);
      socket.off('game:final-answer-result', onFinalAnswerResult);
      socket.off('game:finished', onGameFinished);
      socket.off('game:error', onGameError);
      socket.disconnect();
      if (pendingSuggestionTimeoutRef.current) {
        window.clearTimeout(pendingSuggestionTimeoutRef.current);
        pendingSuggestionTimeoutRef.current = null;
      }
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [roomId, user?.id]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, cooldownUntil - Date.now());
      setCooldownRemaining(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        window.clearInterval(intervalId);
      }
    }, 180);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  function sendReadySignal() {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setEvents((currentEvents) => ['Socket pas encore connecte.', ...currentEvents].slice(0, 8));
      return;
    }

    socket.emit('game:signal', { roomId, event: 'player:ready' });
    setReadySent(true);
    setFinished(false);
    setWinnerUserId(null);
    setSecretWord(null);
    setFinishedStats(null);
    setShowCollectionReward(false);
    setEvents((currentEvents) => ['Pret envoye. En attente de l autre joueur.', ...currentEvents].slice(0, 8));
  }

  function clickSuggestion(wordId: string) {
    const socket = socketRef.current;
    if (!socket?.connected || lockedWordId || waitingForNextSuggestions || finished) {
      return;
    }

    setLockedWordId(wordId);
    setFinalMessage(null);
    socket.emit('game:signal', { roomId, event: 'suggestion:click', data: { wordId } });
  }

  function requestNextSuggestions() {
    const socket = socketRef.current;
    if (!socket?.connected || waitingForNextSuggestions || finished) {
      return;
    }

    socket.emit('game:signal', { roomId, event: 'suggestions:next' });
  }

  function submitFinalAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const socket = socketRef.current;
    const answer = finalAnswer.trim();
    if (!socket?.connected || !answer || finished) {
      return;
    }

    setFinalMessage(null);
    socket.emit('game:signal', { roomId, event: 'final-answer', data: { answer } });
    setFinalAnswer('');
  }

  function startNewMatch() {
    navigate('/matchmaking');
  }

  useEffect(() => {
    if (!showCollectionReward) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setShowCollectionReward(false), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [showCollectionReward]);

  return (
    <section className="page-enter">
      {(isWinner || isLoser) && (
        <div className="victory-overlay">
          {isWinner && confettiPieces.map((piece, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={{
                '--confetti-left': piece.left,
                '--confetti-delay': piece.delay,
                '--confetti-drift': piece.drift,
                '--confetti-rotate': piece.rotate,
                '--confetti-color': piece.color,
              } as CSSProperties}
            />
          ))}
          <div className="victory-banner">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isWinner ? 'Victoire' : 'Defaite'}
            </p>
            <h2 className="mt-2 text-3xl font-black">{isWinner ? 'Tu as trouve le mot' : 'L adversaire a trouve avant toi'}</h2>
            {secretWord && <p className="mt-2 text-sm text-slate-300">Mot secret: {secretWord}</p>}
          </div>
        </div>
      )}

      {showCollectionReward && finishedStats?.collectionRewardWord && (
        <div className="collection-reward">
          <div className="collection-reward-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Nouveau mot</p>
            <p className="mt-2 text-3xl font-black">{finishedStats.collectionRewardWord}</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">Ajoute a ta collection</p>
          </div>
        </div>
      )}

      {finished && finishedStats && (
        <div className="soft-pop">
          <div className={`card-surface p-8 ${isWinner ? 'border-teal-400' : 'border-red-400'}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Fin de partie
            </p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-black">{isWinner ? 'Victoire' : 'Defaite'}</h1>
                <p className="mt-3 text-lg text-slate-500">
                  Mot secret: <span className="font-black text-white">{finishedStats.secretWord}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={startNewMatch}
                className="motion-button rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-700"
              >
                Nouvelle partie
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="panel-surface p-5">
              <p className="text-sm font-semibold text-slate-500">Temps</p>
              <p className="mt-2 text-3xl font-black">{finishedStats.durationSeconds}s</p>
            </div>
            <div className="panel-surface p-5">
              <p className="text-sm font-semibold text-slate-500">Tes essais finaux</p>
              <p className="mt-2 text-3xl font-black">{myFinishedStats?.finalAttemptCount ?? 0}</p>
            </div>
            <div className="panel-surface p-5">
              <p className="text-sm font-semibold text-slate-500">Tes mots selectionnes</p>
              <p className="mt-2 text-3xl font-black">{myFinishedStats?.selectedWordCount ?? 0}</p>
            </div>
            <div className="panel-surface p-5">
              <p className="text-sm font-semibold text-slate-500">Ton meilleur score</p>
              <p className="mt-2 text-3xl font-black">{myFinishedStats?.bestScore ?? 0}%</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="panel-surface p-6">
              <h2 className="text-xl font-bold">Tes stats</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <p className="flex justify-between rounded-md bg-slate-900 px-4 py-3">
                  <span className="text-slate-500">Resultat</span>
                  <span className="font-black">{isWinner ? 'Gagne' : 'Perdu'}</span>
                </p>
                <p className="flex justify-between rounded-md bg-slate-900 px-4 py-3">
                  <span className="text-slate-500">Tentatives finales</span>
                  <span className="font-black">{myFinishedStats?.finalAttemptCount ?? 0}</span>
                </p>
                <p className="flex justify-between rounded-md bg-slate-900 px-4 py-3">
                  <span className="text-slate-500">Mots selectionnes</span>
                  <span className="font-black">{myFinishedStats?.selectedWordCount ?? 0}</span>
                </p>
              </div>
            </div>

            <div className="panel-surface p-6">
              <h2 className="text-xl font-bold">Stats adversaire</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <p className="flex justify-between rounded-md bg-slate-900 px-4 py-3">
                  <span className="text-slate-500">Resultat</span>
                  <span className="font-black">{opponentFinishedStats?.isWinner ? 'Gagne' : 'Perdu'}</span>
                </p>
                <p className="flex justify-between rounded-md bg-slate-900 px-4 py-3">
                  <span className="text-slate-500">Tentatives finales</span>
                  <span className="font-black">{opponentFinishedStats?.finalAttemptCount ?? 0}</span>
                </p>
                <p className="flex justify-between rounded-md bg-slate-900 px-4 py-3">
                  <span className="text-slate-500">Mots selectionnes</span>
                  <span className="font-black">{opponentFinishedStats?.selectedWordCount ?? 0}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!finished && (
        <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Match en ligne</p>
          <h1 className="mt-2 text-3xl font-bold">Lexmon</h1>
          <p className="mt-2 text-sm text-slate-500">Room: <span className="font-mono text-slate-300">{roomId}</span></p>
        </div>
        <div className="panel-surface px-4 py-3">
          <div className="flex items-center gap-2">
            {connected && <span className="status-dot" />}
            <p className={connected ? 'font-semibold text-green-700' : 'font-semibold text-warn'}>
              {connectionStatus}
            </p>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Joueurs: {readyState.players} | Prets: {readyState.ready}
          </p>
        </div>
      </div>
        </>
      )}

      {!finished && (
      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_340px]">
        <main className="grid gap-5">
          {!started && !finished && (
            <div className="card-surface p-6">
              <p className="text-sm font-semibold text-slate-500">Avant de lancer</p>
              <h2 className="mt-2 text-2xl font-bold">Les deux joueurs doivent etre prets.</h2>
              <p className="mt-2 text-slate-600">
                Une fois la partie lancee, chacun recoit ses propres suggestions, mais le mot secret est le meme.
              </p>
              <button
                type="button"
                onClick={sendReadySignal}
                disabled={!connected || readySent}
                className="motion-button ghost-button mt-6 rounded-md border border-slate-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {readySent ? 'En attente de l adversaire' : 'Pret'}
              </button>
            </div>
          )}

          {started && (
            <div className="card-surface p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Suggestions</p>
                  <h2 className="mt-2 text-2xl font-bold">Choisis un mot</h2>
                </div>
                {waitingForNextSuggestions && (
                  <div className="timer-ring" style={{ '--timer-progress': `${(cooldownRemaining / 5) * 100}` } as CSSProperties}>
                    <span>{cooldownRemaining}s</span>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {suggestions.map((suggestion, index) => {
                  const isLocked = lockedWordId !== null;
                  const isSelected = lockedWordId === suggestion.wordId;
                  const revealed = revealedSuggestion?.wordId === suggestion.wordId ? revealedSuggestion : null;
                  const className = revealed
                    ? bucketClasses[revealed.bucket]
                    : isSelected
                      ? 'border-accent bg-teal-950/35 text-teal-100'
                      : 'border-slate-600 bg-slate-900 text-slate-100 hover:border-accent';

                  return (
                    <button
                      key={suggestion.wordId}
                      type="button"
                      onClick={() => clickSuggestion(suggestion.wordId)}
                      disabled={isLocked || waitingForNextSuggestions}
                      className={`interactive-card stagger-item min-h-28 rounded-md border p-5 text-left disabled:cursor-not-allowed disabled:opacity-80 ${className}`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <span className="text-xl font-black">{suggestion.word}</span>
                      {revealed && (
                        <span className="mt-4 flex items-end justify-between gap-3">
                          <span className="text-sm font-semibold">{bucketLabels[revealed.bucket]}</span>
                          <span className="text-3xl font-black">{revealed.score}%</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={requestNextSuggestions}
                  disabled={!connected || waitingForNextSuggestions || lockedWordId !== null}
                  className="motion-button ghost-button rounded-md border border-slate-600 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Suggestion suivante
                </button>
                {waitingForNextSuggestions && (
                  <p className="text-sm font-semibold text-slate-500">
                    Tu peux tenter le mot final pendant ce temps.
                  </p>
                )}
              </div>
            </div>
          )}

          {started && (
            <div className="card-surface p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Reponse finale</p>
              <form onSubmit={submitFinalAnswer} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={finalAnswer}
                  onChange={(event) => setFinalAnswer(event.target.value)}
                  disabled={finished}
                  placeholder="Trouver le mot secret"
                  className="min-h-12 flex-1 rounded-md border border-slate-600 px-4 font-semibold outline-none"
                />
                <button
                  type="submit"
                  disabled={!finalAnswer.trim() || finished}
                  className="motion-button rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  Valider
                </button>
              </form>
              {finalMessage && <p className="soft-pop mt-3 text-sm font-semibold text-amber-300">{finalMessage}</p>}
            </div>
          )}

          <div className="panel-surface p-6">
            <h2 className="text-xl font-bold">Ton historique</h2>
            <div className="mt-4 grid gap-2">
              {sortedHistory.map((item, index) => (
                <div
                  key={`${item.wordId}-${item.createdAt}`}
                  className="stagger-item flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-900 px-4 py-3"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <span className="font-semibold">{item.word}</span>
                  <span className="text-lg font-black text-accent">{item.score}%</span>
                </div>
              ))}
              {sortedHistory.length === 0 && <p className="text-sm text-slate-500">Aucun mot choisi pour le moment.</p>}
            </div>
          </div>
        </main>

        <aside className="grid gap-5">
          <div className="card-surface p-6">
            <h2 className="text-xl font-bold">Adversaire</h2>
            <p className="mt-3 text-sm text-slate-500">
              Tentatives finales: <span className="font-black text-slate-100">{opponentState.finalAttemptCount}</span>
            </p>
            <div className="mt-5 grid gap-2">
              {opponentState.topSuggestions.map((item, index) => (
                <div
                  key={`${item.rank}-${item.createdAt}`}
                  className="stagger-item rounded-md border border-slate-700 bg-slate-900 px-4 py-3"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">#{item.rank}</span>
                    <span className="text-lg font-black text-accent">{item.score}%</span>
                  </div>
                </div>
              ))}
              {opponentState.topSuggestions.length === 0 && (
                <p className="text-sm text-slate-500">Aucun pourcentage revele chez l adversaire.</p>
              )}
            </div>
          </div>

          <div className="panel-surface p-6">
            <h2 className="font-semibold">Evenements</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              {events.map((event, index) => (
                <p
                  key={`${event}-${index}`}
                  className="stagger-item rounded-md bg-slate-50 px-3 py-2"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {event}
                </p>
              ))}
              {events.length === 0 && <p className="text-slate-500">Aucun evenement pour le moment.</p>}
            </div>
          </div>
        </aside>
      </div>
      )}
    </section>
  );
}
