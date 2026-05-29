import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { createSocket } from '../api/socket';
import { useAuthStore } from '../store/auth.store';

interface GameEvent {
  event: string;
  data?: unknown;
}

interface PublicQuestion {
  id: string;
  question: string;
  answers: string[];
  index: number;
  total: number;
}

interface AnswerResult {
  questionId: string;
  correctIndex: number;
}

interface ReadyState {
  players: number;
  ready: number;
  started: boolean;
}

interface AnswerState {
  answered: number;
  players: number;
}

interface GameFinishedPayload {
  winnerUserId: string | null;
  scores: Array<{
    userId: string;
    score: number;
  }>;
}

export function LiveGamePage() {
  const { roomId = 'lobby' } = useParams();
  const user = useAuthStore((state) => state.user);
  const socketRef = useRef<Socket | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connexion...');
  const [events, setEvents] = useState<string[]>([]);
  const [readySent, setReadySent] = useState(false);
  const [readyState, setReadyState] = useState<ReadyState>({ players: 0, ready: 0, started: false });
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [winnerUserId, setWinnerUserId] = useState<string | null>(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    function addEvent(message: string) {
      setEvents((currentEvents) => [message, ...currentEvents].slice(0, 8));
    }

    function onConnect() {
      setConnected(true);
      setConnectionStatus('Connecte');
      socket.emit('room:join', { roomId });
      addEvent('Socket connecte.');
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

    function onRoomJoined() {
      addEvent('Room rejointe.');
    }

    function onGameSignal(payload: GameEvent) {
      addEvent(`Evenement recu: ${payload.event}`);
    }

    function onReadyState(payload: ReadyState) {
      setReadyState(payload);
    }

    function onGameStarted(payload: { totalQuestions: number }) {
      setFinished(false);
      setWinnerUserId(null);
      setCorrectIndex(null);
      setSelectedIndex(null);
      setAnswerState(null);
      addEvent(`Partie lancee: ${payload.totalQuestions} questions.`);
    }

    function onQuestion(payload: PublicQuestion) {
      setQuestion(payload);
      setSelectedIndex(null);
      selectedIndexRef.current = null;
      setCorrectIndex(null);
      setAnswerState(null);
      addEvent(`Question ${payload.index + 1}/${payload.total}.`);
    }

    function onAnswerState(payload: AnswerState) {
      setAnswerState(payload);
    }

    function onAnswerResult(payload: AnswerResult) {
      setCorrectIndex(payload.correctIndex);
      setAnswerState(null);
      setScore((currentScore) => {
        if (selectedIndexRef.current === payload.correctIndex) {
          return currentScore + 1;
        }

        return currentScore;
      });
    }

    function onGameFinished(payload: GameFinishedPayload) {
      setFinished(true);
      setWinnerUserId(payload.winnerUserId);
      setQuestion(null);
      setReadySent(false);
      setReadyState((currentReadyState) => ({ ...currentReadyState, started: false }));
      addEvent('Partie terminee.');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room:joined', onRoomJoined);
    socket.on('game:signal', onGameSignal);
    socket.on('game:ready-state', onReadyState);
    socket.on('game:started', onGameStarted);
    socket.on('game:question', onQuestion);
    socket.on('game:answer-state', onAnswerState);
    socket.on('game:answer-result', onAnswerResult);
    socket.on('game:finished', onGameFinished);
    socket.connect();

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room:joined', onRoomJoined);
      socket.off('game:signal', onGameSignal);
      socket.off('game:ready-state', onReadyState);
      socket.off('game:started', onGameStarted);
      socket.off('game:question', onQuestion);
      socket.off('game:answer-state', onAnswerState);
      socket.off('game:answer-result', onAnswerResult);
      socket.off('game:finished', onGameFinished);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [roomId]);

  function sendReadySignal() {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setEvents((currentEvents) => ['Socket pas encore connecte.', ...currentEvents].slice(0, 8));
      return;
    }

    socket.emit('game:signal', { roomId, event: 'player:ready', data: { at: new Date().toISOString() } });
    setReadySent(true);
    setFinished(false);
    setWinnerUserId(null);
    setScore(0);
    setEvents((currentEvents) => ['Pret envoye a l adversaire.', ...currentEvents].slice(0, 8));
  }

  function submitAnswer(answerIndex: number) {
    const socket = socketRef.current;
    if (!socket?.connected || selectedIndex !== null || correctIndex !== null) {
      return;
    }

    setSelectedIndex(answerIndex);
    selectedIndexRef.current = answerIndex;
    socket.emit('game:signal', { roomId, event: 'game:answer', data: { answerIndex } });
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">Live Game</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Room</p>
          <p className="mt-2 break-all text-xl font-bold">{roomId}</p>
          <div className="mt-6 rounded-md bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Connexion temps reel</p>
            <p className={connected ? 'mt-1 font-semibold text-green-700' : 'mt-1 font-semibold text-warn'}>
              {connectionStatus}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Joueurs: {readyState.players} | Prets: {readyState.ready}
            </p>
          </div>
          {!question && !finished && (
            <button
              type="button"
              onClick={sendReadySignal}
              disabled={!connected || readySent}
              className="mt-6 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {readySent ? 'En attente de l adversaire' : 'Pret'}
            </button>
          )}

          {question && (
            <div className="mt-8 rounded-lg border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-500">
                  Question {question.index + 1} / {question.total}
                </p>
                <p className="text-sm font-semibold text-slate-600">Score: {score}</p>
              </div>
              <h2 className="mt-3 text-2xl font-bold">{question.question}</h2>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {question.answers.map((answer, index) => {
                  const isSelected = selectedIndex === index;
                  const isCorrect = correctIndex === index;
                  const isWrongSelection = correctIndex !== null && isSelected && !isCorrect;
                  const className = correctIndex === null
                    ? isSelected
                      ? 'border-accent bg-teal-50 text-teal-900'
                      : 'border-slate-200 hover:border-accent'
                    : isCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : isWrongSelection
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-slate-200 text-slate-500';

                  return (
                    <button
                      key={answer}
                      type="button"
                      onClick={() => submitAnswer(index)}
                      disabled={selectedIndex !== null || correctIndex !== null}
                      className={`rounded-md border px-4 py-3 text-left font-medium transition ${className}`}
                    >
                      {answer}
                    </button>
                  );
                })}
              </div>
              {answerState && (
                <p className="mt-4 text-sm font-medium text-slate-600">
                  Reponses recues: {answerState.answered} / {answerState.players}
                </p>
              )}
              {correctIndex !== null && (
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Bonne reponse: {question.answers[correctIndex]}
                </p>
              )}
            </div>
          )}

          {finished && (
            <div className="mt-8 rounded-lg border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-500">Resultat</p>
              <p className="mt-2 text-3xl font-bold">{score} points</p>
              {winnerUserId && (
                <p className={winnerUserId === user?.id ? 'mt-2 font-semibold text-green-700' : 'mt-2 font-semibold text-slate-600'}>
                  {winnerUserId === user?.id ? 'Victoire ajoutee au leaderboard.' : 'Defaite enregistree.'}
                </p>
              )}
              {!winnerUserId && <p className="mt-2 font-semibold text-slate-600">Egalite.</p>}
              <button
                type="button"
                onClick={sendReadySignal}
                disabled={!connected}
                className="mt-6 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Rejouer
              </button>
            </div>
          )}
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Evenements</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            {events.map((event, index) => (
              <p key={`${event}-${index}`} className="rounded-md bg-slate-50 px-3 py-2">{event}</p>
            ))}
            {events.length === 0 && <p className="text-slate-500">Aucun evenement pour le moment.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
