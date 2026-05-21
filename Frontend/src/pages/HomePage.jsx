import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import HistoryList from "../components/HistoryList";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      setError("");
      setHistoryLoading(true);
      try {
        const data = await apiRequest("/compare/history", {}, token);
        setHistory(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [token]);

  const storeAndNavigate = (comparison) => {
    localStorage.setItem("price-comparison-result", JSON.stringify(comparison));
    navigate("/result", { state: { comparison } });
  };

  const upsertHistoryEntry = (comparison, fallbackId = undefined) => ({
    _id: fallbackId || window.crypto.randomUUID(),
    productTitle: comparison.title,
    productImage: comparison.image,
    amazonUrl: comparison.amazonUrl,
    flipkartUrl: comparison.flipkartUrl,
    cromaUrl: comparison.cromaUrl,
    amazonPrice: comparison.amazonPrice,
    flipkartPrice: comparison.flipkartPrice,
    cromaPrice: comparison.cromaPrice,
    bestPrice: comparison.bestPrice,
    priceDifference: comparison.priceDifference,
    searchedAt: new Date().toISOString()
  });

  const runComparison = async (amazonUrl, fallbackHistoryId = undefined) => {
    setError("");
    setCompareLoading(true);

    try {
      const comparison = await apiRequest(
        "/compare",
        {
          method: "POST",
          body: { url: amazonUrl }
        },
        token
      );

      const nextHistoryItem = upsertHistoryEntry(comparison, fallbackHistoryId);
      setHistory((current) => [nextHistoryItem, ...current.filter((item) => item._id !== fallbackHistoryId)]);
      storeAndNavigate(comparison);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleCompare = async (event) => {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return;
    }

    await runComparison(trimmedUrl);
    setUrl("");
  };

  const handleHistoryRecompare = async (item) => {
    if (!item.amazonUrl || compareLoading) {
      return;
    }

    await runComparison(item.amazonUrl, item._id);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel overflow-hidden p-8 sm:p-10">
          <span className="rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-600">
            Welcome, {user?.name}
          </span>
          <h1 className="mt-6 max-w-2xl font-['Sora'] text-4xl font-semibold leading-tight text-ink-900">
            Paste an Amazon URL and compare live prices with Flipkart and Croma.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">
            The system extracts the Amazon product title, image, and price, then
            searches Flipkart and Croma for the closest matching listings.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleCompare}>
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-ink-800"
                htmlFor="amazon-url"
              >
                Amazon Product URL
              </label>
              <input
                id="amazon-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="field"
                placeholder="https://www.amazon.in/..."
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            ) : null}

            <button type="submit" className="btn-primary" disabled={compareLoading}>
              {compareLoading ? "Comparing prices..." : "Compare Product"}
            </button>
          </form>
        </div>

        <div className="grid gap-5">
          <article className="rounded-3xl bg-ink-900 p-7 text-white shadow-glow">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/70">
              Functional Flow
            </p>
            <div className="mt-5 space-y-3 text-sm text-white/90">
              <p>1. Login securely with JWT authentication.</p>
              <p>2. Paste an Amazon product URL.</p>
              <p>3. Backend scrapes Amazon and searches Flipkart plus Croma.</p>
              <p>4. Lowest price and difference are shown instantly.</p>
            </div>
          </article>

          <article className="rounded-3xl bg-white/80 p-7 shadow-glow">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-ink-700">
              Output Example
            </p>
            <div className="mt-5 space-y-2 text-sm text-ink-800">
              <p>Product: iPhone 15 128GB</p>
              <p>Amazon Price: Rs. 74,999</p>
              <p>Flipkart Price: Rs. 73,499</p>
              <p>Croma Price: Rs. 74,499</p>
              <p>Lowest Price: Flipkart</p>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-['Sora'] text-2xl font-semibold text-ink-900">
              Recent Search History
            </h2>
            <p className="mt-1 text-sm text-ink-700">
              Click any item to recheck live prices from its saved Amazon URL.
            </p>
          </div>
        </div>

        {historyLoading ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-ink-700 shadow-glow">
            Loading history...
          </div>
        ) : (
          <HistoryList history={history} onSelect={handleHistoryRecompare} loading={compareLoading} />
        )}
      </section>
    </main>
  );
};

export default HomePage;
