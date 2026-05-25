import { useMemo, useState } from 'react';

const questions = [
  {
    question: 'Quel protocole est utilise pour les evenements temps reel dans ce projet ?',
    answers: ['Socket.IO', 'SMTP', 'FTP', 'Cron'],
    correctIndex: 0,
  },
  {
    question: 'Quel outil gere le schema de base de donnees cote backend ?',
    answers: ['Prisma', 'Tailwind', 'Vite', 'Zustand'],
    correctIndex: 0,
  },
  {
    question: 'Quel framework backend est utilise ?',
    answers: ['NestJS', 'Express brut', 'Laravel', 'Django'],
    correctIndex: 0,
  },
  {
    question: 'Quel store frontend est prevu pour l etat global ?',
    answers: ['Zustand', 'Redux Toolkit', 'MobX', 'RxDB'],
    correctIndex: 0,
  },
];

export function SoloGamePage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const currentQuestion = questions[questionIndex];

  const progress = useMemo(() => Math.round(((questionIndex + 1) / questions.length) * 100), [questionIndex]);

  function answer(index: number) {
    if (selectedIndex !== null) {
      return;
    }

    setSelectedIndex(index);
    if (index === currentQuestion.correctIndex) {
      setScore((currentScore) => currentScore + 1);
    }
  }

  function next() {
    if (questionIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }

    setQuestionIndex((currentIndex) => currentIndex + 1);
    setSelectedIndex(null);
  }

  function restart() {
    setQuestionIndex(0);
    setScore(0);
    setSelectedIndex(null);
    setFinished(false);
  }

  if (finished) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Partie solo</h1>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Resultat</p>
          <p className="mt-3 text-4xl font-bold">{score} / {questions.length}</p>
          <button type="button" onClick={restart} className="mt-6 rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800">
            Rejouer
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">Partie solo</h1>
      <p className="mt-2 text-slate-600">Un mode local simple pour tester le flux quiz.</p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>

        <p className="mt-6 text-sm font-medium text-slate-500">Question {questionIndex + 1} / {questions.length}</p>
        <h2 className="mt-2 text-2xl font-bold">{currentQuestion.question}</h2>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {currentQuestion.answers.map((answerText, index) => {
            const isSelected = selectedIndex === index;
            const isCorrect = currentQuestion.correctIndex === index;
            const revealedClass = selectedIndex === null
              ? 'border-slate-200 hover:border-accent'
              : isCorrect
                ? 'border-green-500 bg-green-50 text-green-800'
                : isSelected
                  ? 'border-red-500 bg-red-50 text-red-800'
                  : 'border-slate-200 text-slate-500';

            return (
              <button
                key={answerText}
                type="button"
                onClick={() => answer(index)}
                className={`rounded-md border px-4 py-3 text-left font-medium transition ${revealedClass}`}
              >
                {answerText}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Score: {score}</p>
          <button
            type="button"
            onClick={next}
            disabled={selectedIndex === null}
            className="rounded-md bg-accent px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {questionIndex + 1 >= questions.length ? 'Terminer' : 'Question suivante'}
          </button>
        </div>
      </div>
    </section>
  );
}
