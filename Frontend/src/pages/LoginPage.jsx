import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: formData
      });

      login(data);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
      <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex animate-reveal flex-col justify-center">
          <span className="w-fit rounded-full border border-brand-500/30 bg-brand-500/12 px-4 py-2 text-sm font-bold text-brand-200">
             Price Tracker
          </span>
          <h1 className="mt-6 max-w-xl font-['Sora'] text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            Compare real Amazon, Flipkart, and Croma prices before you buy.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-600">
            Sign in, paste an Amazon product URL, and get a side-by-side price
            comparison with the lowest available option.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {[
              "Dark premium workspace built for fast product checks.",
              "Cleaner comparison cards with exact-match-first results."
            ].map((point, index) => (
              <div
                key={point}
                className={`rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-ink-700 ${
                  index === 0 ? "animate-float-slow" : "animate-drift"
                }`}
              >
                {point}
              </div>
            ))}
          </div>
        </section>

        <section className="panel animate-reveal relative overflow-hidden p-8 sm:p-10">
          <div className="absolute right-[-3rem] top-6 h-32 w-32 rounded-full bg-brand-500/10 blur-3xl" />
          <h2 className="font-['Sora'] text-3xl font-semibold text-ink-900">Login</h2>
          <p className="mt-2 text-sm text-ink-600">Access your account securely.</p>

          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-semibold text-ink-700"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="field"
                placeholder="Enter your password"
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-600">
            New here?{" "}
            <Link to="/register" className="font-semibold text-brand-200">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
