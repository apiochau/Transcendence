export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-ink">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. Data We Collect</h2>
        <p className="leading-7 text-slate-600">
          When you create a Lexmon account, we collect your email address, username, and a hashed
          password. If you sign in via OAuth (Google, GitHub, or 42), we receive your email and
          public profile from that provider. We never store your OAuth provider password.
        </p>
        <p className="mt-3 leading-7 text-slate-600">
          During gameplay we store your game sessions, suggestion history, match results, word
          collection, and statistics. If you enable 2FA, we store a TOTP secret linked to your
          account. Chat messages and uploaded avatars are also stored.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. How We Use Your Data</h2>
        <ul className="list-disc space-y-2 pl-5 leading-7 text-slate-600">
          <li>To authenticate you and maintain your session via JWT.</li>
          <li>To operate matchmaking, leaderboards, collections, and tournaments.</li>
          <li>To display your profile and statistics to other players.</li>
          <li>To send in-app notifications related to game events.</li>
          <li>To generate anonymised analytics dashboards.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. Data Sharing</h2>
        <p className="leading-7 text-slate-600">
          We do not sell or share your personal data with third parties. Your username, avatar,
          and game statistics are visible to other registered players as part of the social
          features of Lexmon.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. Data Retention</h2>
        <p className="leading-7 text-slate-600">
          Your data is retained for as long as your account exists. You may request deletion by
          contacting the project team. Upon deletion, your personal information, game history,
          and collection will be permanently removed.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. Cookies and Local Storage</h2>
        <p className="leading-7 text-slate-600">
          Lexmon uses your browser's local storage to persist your authentication token between
          sessions. No third-party tracking cookies are used.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. Security</h2>
        <p className="leading-7 text-slate-600">
          Passwords are hashed with bcrypt. Tokens are signed with a server-side secret.
          We take reasonable measures to protect your data.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">7. Contact</h2>
        <p className="leading-7 text-slate-600">
          This project was created as part of the 42 curriculum. For any questions regarding
          your data, please contact the project team through your 42 intra profile.
        </p>
      </section>
    </div>
  );
}