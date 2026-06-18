import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-slate-700 py-6 text-center text-xs text-slate-500">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link to="/privacy-policy" className="hover:text-slate-300 transition">
          Privacy Policy
        </Link>
        <Link to="/terms-of-service" className="hover:text-slate-300 transition">
          Terms of Service
        </Link>
      </div>
      <p className="mt-3">© 2026 Lexmon — 42 Curriculum Project</p>
    </footer>
  );
}