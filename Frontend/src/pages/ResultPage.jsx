import { Link, useLocation } from "react-router-dom";
import PriceSummary from "../components/PriceSummary";

const formatPrice = (price) =>
  typeof price === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(price)
    : "Not available";

const ResultPage = () => {
  const location = useLocation();
  let storedComparison = null;

  try {
    storedComparison = JSON.parse(localStorage.getItem("price-comparison-result") || "null");
  } catch (error) {
    localStorage.removeItem("price-comparison-result");
  }

  const comparison = location.state?.comparison || storedComparison;

  if (!comparison) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-14">
        <div className="panel animate-reveal p-8 text-center">
          <h1 className="font-['Sora'] text-3xl font-semibold text-ink-900">No result found</h1>
          <p className="mt-3 text-ink-600">
            Compare a product first to see the result page.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="panel animate-reveal relative overflow-hidden p-8 sm:p-10">
          <div className="absolute -right-14 top-10 h-44 w-44 animate-float-slow rounded-full bg-brand-500/12 blur-3xl" />
          <div className="absolute bottom-[-3rem] left-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
          <img
            src={comparison.image || "https://placehold.co/420x420?text=Product"}
            alt={comparison.title}
            className="relative z-10 h-80 w-full rounded-3xl border border-white/10 bg-royal-950/80 object-cover"
          />
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-brand-200">
            Product
          </p>
          <h3 className="mt-3 font-['Sora'] text-lg font-semibold leading-8 text-ink-900 sm:text-[1.28rem]">
            {comparison.title}
          </h3>
          <p className="mt-4 text-base text-ink-600">{comparison.message}</p>

          <div className="mt-8 grid gap-4 rounded-[28px] border border-white/10 bg-royal-950/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-ink-600">Lowest Price</span>
              <div className="rounded-2xl border border-brand-500/35 bg-gradient-to-br from-brand-500/18 via-brand-500/10 to-white/5 px-4 py-2 text-right shadow-[0_14px_35px_rgba(3,8,24,0.28)]">
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-brand-200">
                  Best Deal
                </span>
                <span className="mt-1 block font-['Sora'] text-base font-semibold text-ink-900">
                  {comparison.bestPrice}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-ink-600">Price Difference</span>
              <span className="text-lg font-bold text-ink-900">
                {formatPrice(comparison.priceDifference)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="btn-primary">
              Compare Another Product
            </Link>
          </div>
        </article>

        <section className="space-y-6 animate-reveal">
          <PriceSummary comparison={comparison} />

          <article className="panel relative overflow-hidden p-8">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" />
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-ink-600">
              Final Output
            </p>
            <div className="mt-5 space-y-2 text-base text-ink-700">
              <p>Amazon Price: {formatPrice(comparison.amazonPrice)}</p>
              <p>Flipkart Price: {formatPrice(comparison.flipkartPrice)}</p>
              <p>Croma Price: {formatPrice(comparison.cromaPrice)}</p>
              <p>Lowest Price: {comparison.bestPrice}</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
};

export default ResultPage;
