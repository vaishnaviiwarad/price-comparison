const formatPrice = (price) =>
  typeof price === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(price)
    : "Not available";

const cards = [
  {
    key: "amazon",
    label: "Amazon",
    accent: "from-amber-100 to-orange-50"
  },
  {
    key: "flipkart",
    label: "Flipkart",
    accent: "from-sky-100 to-cyan-50"
  }
];

const PriceSummary = ({ comparison }) => (
  <div className="grid gap-5 lg:grid-cols-2">
    {cards.map((card) => {
      const price =
        card.key === "amazon" ? comparison.amazonPrice : comparison.flipkartPrice;
      const url = card.key === "amazon" ? comparison.amazonUrl : comparison.flipkartUrl;
      const isWinner = comparison.bestPrice === card.label;

      return (
        <article
          key={card.key}
          className={`rounded-3xl border border-white/80 bg-gradient-to-br ${card.accent} p-6 shadow-glow`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-ink-700">
              {card.label}
            </p>
            {isWinner ? (
              <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                Lowest Price
              </span>
            ) : null}
          </div>
          <p className="mt-6 font-['Sora'] text-3xl font-semibold text-ink-900">
            {formatPrice(price)}
          </p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex text-sm font-semibold text-ink-900 underline decoration-2 underline-offset-4"
            >
              Open on {card.label}
            </a>
          ) : (
            <span className="mt-5 inline-flex text-sm font-semibold text-slate-400">
              {card.label} listing not confirmed
            </span>
          )}
        </article>
      );
    })}
  </div>
);

export default PriceSummary;
