import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import HistoryList from "../components/HistoryList";
import { useAuth } from "../context/AuthContext";

const assuranceCards = [
  {
    title: "Exact Variant First",
    copy: "Storage, model, and major variant details are checked before a store result is shown."
  },
  {
    title: "Three-Store View",
    copy: "Compare Amazon, Flipkart, and Croma from one product link without opening multiple tabs."
  },
  {
    title: "Safer Price Checks",
    copy: "Offer snippets, exchange values, and suspicious outlier prices are filtered before display."
  }
];

const storeCards = [
  {
    label: "Amazon",
    accent: "from-brand-500/16 via-brand-500/8 to-transparent",
    copy: "Product title, image, and main selling price are extracted from the live page."
  },
  {
    label: "Flipkart",
    accent: "from-royal-500/24 via-royal-500/12 to-transparent",
    copy: "Matching focuses on the exact model and variant instead of loose keyword overlap."
  },
  {
    label: "Croma",
    accent: "from-coral/16 via-brand-500/6 to-transparent",
    copy: "Confirmed Croma listings are included only when the product match stays reliable."
  }
];

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

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel animate-reveal relative overflow-hidden p-8 sm:p-10">
          <div className="absolute -right-12 top-6 h-44 w-44 animate-float-slow rounded-full bg-brand-500/12 blur-3xl" />
          <div className="absolute bottom-0 right-20 h-28 w-28 animate-drift rounded-full bg-royal-500/20 blur-2xl" />
          <div className="absolute left-10 top-0 h-px w-40 bg-gradient-to-r from-transparent via-brand-200/70 to-transparent" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-brand-500/30 bg-brand-500/12 px-4 py-2 text-sm font-bold text-brand-200">
                Welcome, {user?.name}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-ink-600">
                Compare gadgets from one link
              </span>
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.24em] text-brand-200">
              Price Comparison System
            </p>
            <h1 className="mt-3 max-w-3xl font-['Sora'] text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Check Amazon, Flipkart, and Croma prices without the variant confusion.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-600">
              Paste one Amazon product URL and get a cleaner comparison view for confirmed store matches
              only.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleCompare}>
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-ink-700"
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
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="btn-primary min-w-[190px]" disabled={compareLoading}>
                {compareLoading ? "Comparing prices..." : "Compare Product"}
              </button>
            </form>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {assuranceCards.map((card, index) => (
                <article
                  key={card.title}
                  className={`rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-halo backdrop-blur ${
                    index === 1 ? "animate-drift" : "animate-float-slow"
                  }`}
                >
                  <p className="text-sm font-bold text-ink-900">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-600">{card.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <article className="panel animate-reveal overflow-hidden p-7">
            <div className="mb-5 h-px w-24 bg-gradient-to-r from-brand-200/80 to-transparent" />
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-ink-500">
              Cleaner Results
            </p>
            <h2 className="mt-4 font-['Sora'] text-2xl font-semibold leading-tight text-ink-900">
              Exact match first. Better to reject a weak result than show the wrong product.
            </h2>
            <div className="mt-6 grid gap-3">
              {[
                "Model and variant details are checked before a store result is accepted.",
                "Loose listings and misleading offer prices are filtered out.",
                "The result page stays focused on the stores that really match."
              ].map((point, index) => (
                <div
                  key={point}
                  className={`rounded-2xl border border-white/10 bg-royal-950/55 px-4 py-3 text-sm leading-6 text-ink-700 ${
                    index === 1 ? "animate-float-slow" : ""
                  }`}
                >
                  {point}
                </div>
              ))}
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {storeCards.map((card, index) => (
              <article
                key={card.label}
                className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${card.accent} from-royal-900/88 via-royal-900/94 to-royal-950/94 p-5 shadow-halo transition duration-300 hover:-translate-y-1 ${
                  index === 0 ? "animate-float-slow" : index === 1 ? "animate-drift" : "animate-reveal"
                }`}
              >
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-ink-600">
                  {card.label}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-700">{card.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="font-['Sora'] text-2xl font-semibold text-ink-900">
            Recent Search History
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            A clean snapshot of your most recent saved comparisons.
          </p>
        </div>

        {historyLoading ? (
          <div className="panel p-6 text-sm text-ink-600">
            Loading history...
          </div>
        ) : (
          <HistoryList history={history} />
        )}
      </section>
    </main>
  );
};

export default HomePage;
