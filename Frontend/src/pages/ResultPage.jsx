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
        <div className="panel p-8 text-center">
          <h1 className="font-['Sora'] text-3xl font-semibold text-ink-900">No result found</h1>
          <p className="mt-3 text-ink-700">
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
        <article className="panel p-8 sm:p-10">
          <img
            src={comparison.image || "https://placehold.co/420x420?text=Product"}
            alt={comparison.title}
            className="h-80 w-full rounded-3xl bg-slate-100 object-cover"
          />
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-brand-600">
            Product
          </p>
          <h1 className="mt-3 font-['Sora'] text-3xl font-semibold text-ink-900">
            {comparison.title}
          </h1>
          <p className="mt-4 text-base text-ink-700">{comparison.message}</p>

          <div className="mt-8 grid gap-4 rounded-3xl bg-sand p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-ink-700">Lowest Price</span>
              <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white">
                {comparison.bestPrice}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-ink-700">Price Difference</span>
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

        <section className="space-y-6">
          <PriceSummary comparison={comparison} />

          <article className="panel p-8">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-ink-700">
              Final Output
            </p>
            <div className="mt-5 space-y-2 text-base text-ink-800">
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
