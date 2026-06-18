export function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-ink">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. Acceptance</h2>
        <p className="leading-7 text-slate-600">
          By creating an account or using Lexmon, you agree to these Terms of Service.
          If you do not agree, do not use the application.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. Account Responsibilities</h2>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-slate-600">
          <li>You are responsible for maintaining the confidentiality of your credentials.</li>
          <li>You must not share your account with others.</li>
          <li>You must provide accurate information when registering.</li>
          <li>You must be at least 13 years old to use this service.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. Acceptable Use</h2>
        <p className="leading-7 text-slate-600">You agree not to:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-slate-600">
          <li>Attempt to exploit, hack, or disrupt the service.</li>
          <li>Use automated scripts or bots to interact with the game.</li>
          <li>Harass or abuse other players through the chat system.</li>
          <li>Upload inappropriate or illegal content as your avatar.</li>
          <li>Attempt to manipulate matchmaking, rankings, or word collections unfairly.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. Game Rules</h2>
        <p className="leading-7 text-slate-600">
          Lexmon is a competitive semantic word game. Players must find secret words using
          proximity scores. Daily mode is limited to one match per day. Duel mode involves
          staking collection words — results are final. The leaderboard reflects total collection
          value and is updated in real time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. Intellectual Property</h2>
        <p className="leading-7 text-slate-600">
          Lexmon was created as a 42 curriculum project. The word embeddings and semantic data
          used in the game are derived from publicly available linguistic resources.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. Termination</h2>
        <p className="leading-7 text-slate-600">
          We reserve the right to suspend or delete accounts that violate these terms.
          You may delete your account at any time by contacting the project team.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">7. Disclaimer</h2>
        <p className="leading-7 text-slate-600">
          Lexmon is provided as-is for educational purposes as part of the 42 curriculum.
          We make no warranties regarding availability or fitness for a particular purpose.
        </p>
      </section>
    </div>
  );
}