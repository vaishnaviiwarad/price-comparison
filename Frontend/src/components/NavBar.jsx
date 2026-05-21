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
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900 text-lg font-bold text-white">
            PC
          </span>
          <div>
            <p className="font-['Sora'] text-lg font-semibold text-ink-900">
              Price Comparison
            </p>
            <p className="text-sm text-ink-700">Amazon, Flipkart, and Croma in one place</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl bg-sand px-4 py-2 text-sm font-medium text-ink-800 sm:block">
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
