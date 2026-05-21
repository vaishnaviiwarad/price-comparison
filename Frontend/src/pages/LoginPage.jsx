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
        <section className="flex flex-col justify-center">
          <span className="w-fit rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-600">
            MERN Price Tracker
          </span>
          <h1 className="mt-6 max-w-xl font-['Sora'] text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            Compare real Amazon and Flipkart prices before you buy.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-700">
            Sign in, paste an Amazon product URL, and get a side-by-side price
            comparison with the lowest available option.
          </p>
        </section>

        <section className="panel p-8 sm:p-10">
          <h2 className="font-['Sora'] text-3xl font-semibold text-ink-900">Login</h2>
          <p className="mt-2 text-sm text-ink-700">Access your account securely.</p>

          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-800" htmlFor="email">
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
                className="mb-2 block text-sm font-semibold text-ink-800"
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
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-700">
            New here?{" "}
            <Link to="/register" className="font-semibold text-brand-600">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
