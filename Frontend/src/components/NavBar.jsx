import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-royal-950/55 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-200 to-brand-600 text-lg font-bold text-royal-950 shadow-[0_10px_25px_rgba(208,162,74,0.28)] transition duration-300 group-hover:-translate-y-0.5">
            PC
          </span>
          <div>
            <p className="font-['Sora'] text-lg font-semibold text-ink-900">
              Price Comparison
            </p>
            <p className="text-sm text-ink-600">Amazon, Flipkart, and Croma in one place</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-ink-700 sm:block">
            Signed in as {user?.name}
          </div>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
