import { useAuthStore } from '../store/auth.store';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="page-enter">
      <h1 className="text-3xl font-bold">Profile</h1>
      <div className="card-surface mt-8 p-6">
        <p className="text-sm text-slate-500">Username</p>
        <p className="mt-1 text-lg font-semibold">{user?.username}</p>
        <p className="mt-4 text-sm text-slate-500">Email</p>
        <p className="mt-1 text-lg font-semibold">{user?.email}</p>
      </div>
    </section>
  );
}
