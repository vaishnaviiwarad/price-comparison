import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResultPage from "./pages/ResultPage";

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero px-6">
        <div className="absolute left-[-6rem] top-20 h-72 w-72 rounded-full bg-brand-500/12 blur-3xl" />
        <div className="absolute bottom-10 right-[-3rem] h-80 w-80 rounded-full bg-royal-500/18 blur-3xl" />
        <div className="panel animate-reveal px-8 py-6 text-lg font-semibold text-ink-800">
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero text-ink-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-8 h-96 w-96 animate-drift rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-[-7rem] top-32 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-royal-500/20 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] animate-drift rounded-full bg-white/5 blur-3xl" />
      </div>
      {isAuthenticated ? <NavBar /> : null}
      <div className="relative z-10">
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result"
            element={
              <ProtectedRoute>
                <ResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
          />
        </Routes>
      </div>
    </div>
  );
};

export default App;
