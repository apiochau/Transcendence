import { useAuthStore } from '../store/auth.store';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section>
      <h1 className="text-3xl font-bold">Profile</h1>
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Username</p>
        <p className="mt-1 text-lg font-semibold">{user?.username}</p>
        <p className="mt-4 text-sm text-slate-500">Email</p>
        <p className="mt-1 text-lg font-semibold">{user?.email}</p>
      </div>
    </section>
  );
}
