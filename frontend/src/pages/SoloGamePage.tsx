import { CSSProperties, FormEvent, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../api/error';
import {
  RevealedSuggestion,
  SimilarityBucket,
  SuggestedWord,
  SuggestionHistoryItem,
  clickSoloSuggestion,
  getSoloHistory,
  getSoloSuggestions,
  giveUpSoloGame,
  startSoloGame,
  submitFinalAnswer,
} from '../api/game';

const bucketLabel: Record<SimilarityBucket, string> = {
  hot: 'Chaud',
  warm: 'Tiede',
  cold: 'Froid',
  frozen: 'Glace',
};

const bucketClass: Record<SimilarityBucket, string> = {
  hot: 'border-emerald-500 bg-emerald-950/50 text-emerald-200 shadow-[0_0_34px_rgb(16_185_129_/_0.16)]',
  warm: 'border-amber-500 bg-amber-950/50 text-amber-200 shadow-[0_0_34px_rgb(245_158_11_/_0.14)]',
  cold: 'border-sky-500 bg-sky-950/50 text-sky-200 shadow-[0_0_34px_rgb(14_165_233_/_0.13)]',
  frozen: 'border-slate-500 bg-slate-900/60 text-slate-200',
};

const confettiPieces = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 29) % 100}%`,
  delay: `${(index % 9) * 0.08}s`,
  drift: `${((index % 7) - 3) * 18}px`,
  rotate: `${(index * 47) % 180}deg`,
  color: ['#14b8a6', '#f59e0b', '#38bdf8', '#a78bfa', '#f472b6'][index % 5],
}));

export function SoloGamePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedWord[]>([]);
  const [revealed, setRevealed] = useState<Record<string, RevealedSuggestion>>({});
  const [history, setHistory] = useState<SuggestionHistoryItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [finalMessage, setFinalMessage] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [clickedWordId, setClickedWordId] = useState<string | null>(null);
  const [roundCooldown, setRoundCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const nextRoundTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  function clearRoundTimers() {
    if (nextRoundTimeoutRef.current !== null) {
      window.clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }

  const timerProgress = roundCooldown > 0 ? (roundCooldown / 5) * 100 : 0;

  async function loadSuggestions(nextSessionId: string) {
    setIsLoadingSuggestions(true);
    setError(null);

    try {
      const nextSuggestions = await getSoloSuggestions(nextSessionId);
      setSuggestions(nextSuggestions);
      setRevealed({});
      setRoundCooldown(0);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Impossible de charger les suggestions.'));
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  async function refreshHistory(nextSessionId: string) {
    const nextHistory = await getSoloHistory(nextSessionId);
    setHistory(nextHistory);
  }

  async function startGame() {
    setIsStarting(true);
    clearRoundTimers();
    setError(null);
    setFinalMessage(null);
    setRevealedSecret(null);
    setShowVictory(false);
    setIsFinished(false);
    setHistory([]);
    setSuggestions([]);
    setRevealed({});
    setAnswer('');
    setRoundCooldown(0);

    try {
      const session = await startSoloGame();
      setSessionId(session.sessionId);
      await loadSuggestions(session.sessionId);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Impossible de lancer une partie solo.'));
    } finally {
      setIsStarting(false);
    }
  }

  async function clickSuggestion(suggestion: SuggestedWord) {
    if (!sessionId || isFinished || roundCooldown > 0 || revealed[suggestion.wordId]) {
      return;
    }

    clearRoundTimers();
    setClickedWordId(suggestion.wordId);
    setRoundCooldown(5);
    setError(null);

    try {
      const result = await clickSoloSuggestion(sessionId, suggestion.wordId);
      setRevealed((current) => ({ ...current, [suggestion.wordId]: result }));
      await refreshHistory(sessionId);

      countdownIntervalRef.current = window.setInterval(() => {
        setRoundCooldown((current) => {
          if (current <= 1) {
            if (countdownIntervalRef.current !== null) {
              window.clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            return 0;
          }

          return current - 1;
        });
      }, 1000);

      nextRoundTimeoutRef.current = window.setTimeout(() => {
        nextRoundTimeoutRef.current = null;
        void loadSuggestions(sessionId);
      }, 5100);
    } catch (caughtError) {
      setRoundCooldown(0);
      setError(getApiErrorMessage(caughtError, 'Impossible de reveler cette suggestion.'));
    } finally {
      setClickedWordId(null);
    }
  }

  async function nextSuggestions() {
    if (!sessionId || isFinished || roundCooldown > 0) {
      return;
    }

    await loadSuggestions(sessionId);
  }

  async function finalAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionId || !answer.trim() || isFinished) {
      return;
    }

    setError(null);
    setFinalMessage(null);

    try {
      const result = await submitFinalAnswer(sessionId, answer);

      if (result.success) {
        clearRoundTimers();
        setIsFinished(true);
        setRoundCooldown(0);
        setFinalMessage('Bonne reponse.');
        setShowVictory(true);
      } else {
        setFinalMessage('Mauvaise reponse.');
      }

      setAnswer('');
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Impossible de valider la reponse finale.'));
    }
  }

  async function giveUp() {
    if (!sessionId || isFinished) {
      return;
    }

    clearRoundTimers();
    setError(null);
    setFinalMessage(null);
    setRoundCooldown(0);

    try {
      const result = await giveUpSoloGame(sessionId);
      setIsFinished(true);
      setRevealedSecret(result.secretWord);
      setFinalMessage('Partie abandonnee.');
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Impossible d abandonner la partie.'));
    }
  }

  useEffect(() => {
    void startGame();

    return () => {
      clearRoundTimers();
    };
  }, []);

  return (
    <section className="page-enter">
      {showVictory && (
        <div className="victory-overlay" aria-hidden="true" onAnimationEnd={() => setShowVictory(false)}>
          <div className="victory-banner">
            <p className="text-sm font-semibold uppercase text-accent">Victoire</p>
            <p className="mt-1 text-3xl font-bold">Mot trouve</p>
          </div>
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={
                {
                  '--confetti-left': piece.left,
                  '--confetti-delay': piece.delay,
                  '--confetti-drift': piece.drift,
                  '--confetti-rotate': piece.rotate,
                  '--confetti-color': piece.color,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lexmon</h1>
          <p className="mt-2 text-slate-600">Choisis parmi les suggestions, puis tente la reponse finale.</p>
        </div>
        <button
          type="button"
          onClick={startGame}
          disabled={isStarting}
          className="motion-button ghost-button rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStarting ? 'Creation...' : 'Nouvelle partie'}
        </button>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="panel-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Partie solo</p>
              <p className="mt-1 text-lg font-semibold">
                {isFinished
                  ? 'Partie terminee'
                  : roundCooldown > 0
                    ? `Prochaine manche dans ${roundCooldown}s`
                    : 'Suggestions controlees'}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 px-3 py-2 text-right">
              <p className="text-xs font-medium text-slate-500">Historique</p>
              <p className="text-xl font-bold">{history.length}</p>
            </div>
          </div>

          {roundCooldown > 0 && (
            <div className="soft-pop mt-5 flex items-center gap-4 rounded-md border border-accent/40 bg-teal-950/30 p-4">
              <div className="timer-ring" style={{ '--timer-progress': timerProgress } as CSSProperties}>
                <span>{roundCooldown}s</span>
              </div>
              <div>
                <p className="font-semibold text-teal-100">Fenetre de reponse finale</p>
                <p className="mt-1 text-sm text-slate-600">Les prochaines suggestions arrivent automatiquement.</p>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {suggestions.map((suggestion, index) => {
              const result = revealed[suggestion.wordId];
              const isClicked = clickedWordId === suggestion.wordId;
              const className = result
                ? bucketClass[result.bucket]
                : 'border-slate-200 bg-slate-900/20 text-ink hover:border-accent';

              return (
                <button
                  key={suggestion.wordId}
                  type="button"
                  onClick={() => void clickSuggestion(suggestion)}
                  disabled={isFinished || roundCooldown > 0 || isClicked || Boolean(result)}
                  className={`interactive-card stagger-item min-h-28 rounded-md border p-4 text-left disabled:cursor-not-allowed disabled:opacity-75 ${className}`}
                  style={{ animationDelay: `${index * 65}ms` }}
                >
                  <p className="text-lg font-bold">{suggestion.word}</p>
                  {result ? (
                    <div className="mt-3">
                      <p className="text-3xl font-bold">{result.score}%</p>
                      <p className="text-sm font-medium">{bucketLabel[result.bucket]}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">{isClicked ? 'Calcul...' : 'Score cache'}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={nextSuggestions}
                disabled={!sessionId || isFinished || isLoadingSuggestions || roundCooldown > 0}
                className="motion-button ghost-button rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roundCooldown > 0
                  ? `Auto dans ${roundCooldown}s`
                  : isLoadingSuggestions
                    ? 'Chargement...'
                    : 'Suggestions suivantes'}
              </button>
              <button
                type="button"
                onClick={giveUp}
                disabled={!sessionId || isFinished}
                className="motion-button danger-button rounded-md border px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Abandonner
              </button>
            </div>

            <form onSubmit={finalAnswer} className="flex flex-1 flex-col gap-3 sm:max-w-md sm:flex-row">
              <input
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={!sessionId || isFinished}
                placeholder="Reponse finale"
                className="min-h-12 flex-1 rounded-md border border-slate-300 px-4 py-3 outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!sessionId || isFinished || !answer.trim()}
                className="motion-button min-h-12 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Valider
              </button>
            </form>
          </div>

          {finalMessage && <p className="soft-pop mt-4 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">{finalMessage}</p>}
          {revealedSecret && (
            <p className="soft-pop mt-3 rounded-md border border-red-400/50 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-100">
              Mot secret: {revealedSecret}
            </p>
          )}
          {error && <p className="soft-pop mt-4 rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}
        </div>

        <aside className="panel-surface p-6">
          <h2 className="text-lg font-semibold">Historique</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Aucune suggestion revelee.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {history.map((item, index) => (
                <div
                  key={`${item.createdAt}-${item.wordId}`}
                  className="stagger-item flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 transition hover:border-accent hover:bg-slate-100"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.word}</p>
                    <p className="text-xs text-slate-500">{bucketLabel[item.bucket]}</p>
                  </div>
                  <p className="shrink-0 text-lg font-bold">{item.score}%</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
