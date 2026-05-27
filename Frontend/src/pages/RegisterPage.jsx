import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: formData
      });

      setSuccess(data.message);
      setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
      <div className="grid w-full gap-10 lg:grid-cols-[1fr_1fr]">
        <section className="panel animate-reveal relative overflow-hidden p-8 sm:p-10">
          <div className="absolute left-[-3rem] top-10 h-32 w-32 rounded-full bg-royal-500/18 blur-3xl" />
          <h1 className="font-['Sora'] text-3xl font-semibold text-ink-900">Register</h1>
          <p className="mt-2 text-sm text-ink-600">
            Create your account to save comparisons and search history.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleRegister}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-700" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="field"
                placeholder="Enter your name"
                required
              />
            </div>

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
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-100">
                {success}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand-200">
              Login
            </Link>
          </p>
        </section>

        <section className="flex animate-reveal flex-col justify-center">
          <span className="w-fit rounded-full border border-brand-500/30 bg-brand-500/12 px-4 py-2 text-sm font-bold text-brand-200">
            Real-time product search
          </span>
          <h2 className="mt-6 max-w-xl font-['Sora'] text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            Track the best deal with one Amazon link.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-600">
            After login, paste a real Amazon product URL and compare it against
            Flipkart and Croma pricing from the same dashboard.
          </p>
          <div className="mt-8 grid max-w-xl gap-3">
            {[
              "Premium dark interface with subtle movement across sections.",
              "Saved comparisons stay visible in one calm, uncluttered workspace."
            ].map((point, index) => (
              <div
                key={point}
                className={`rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-ink-700 ${
                  index === 0 ? "animate-drift" : "animate-float-slow"
                }`}
              >
                {point}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
