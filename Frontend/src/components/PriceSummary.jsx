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
    accent: "from-brand-500/14 via-brand-500/8 to-transparent"
  },
  {
    key: "flipkart",
    label: "Flipkart",
    accent: "from-royal-500/25 via-royal-500/12 to-transparent"
  },
  {
    key: "croma",
    label: "Croma",
    accent: "from-coral/18 via-brand-500/6 to-transparent"
  }
];

const PriceSummary = ({ comparison }) => (
  <div className="grid gap-5 xl:grid-cols-3">
    {cards.map((card) => {
      const price = comparison[`${card.key}Price`];
      const url = comparison[`${card.key}Url`];
      const isWinner =
        typeof price === "number" && typeof comparison.lowestPrice === "number" && price === comparison.lowestPrice;

      return (
        <article
          key={card.key}
          className={`relative overflow-hidden rounded-[30px] border p-6 shadow-halo transition duration-300 hover:-translate-y-1 ${
            isWinner
              ? "border-brand-500/35 bg-gradient-to-br from-brand-500/18 via-royal-900/95 to-royal-950/95"
              : `border-white/10 bg-gradient-to-br ${card.accent} from-royal-900/88 via-royal-900/94 to-royal-950/94`
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-ink-600">
              {card.label}
            </p>
            {isWinner ? (
              <span className="rounded-full border border-brand-500/40 bg-brand-500/18 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-100">
                Best Deal
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
              className="mt-5 inline-flex text-sm font-semibold text-brand-200 underline decoration-brand-200/60 decoration-2 underline-offset-4"
            >
              Open on {card.label}
            </a>
          ) : (
            <span className="mt-5 inline-flex text-sm font-semibold text-ink-500">
              {card.label} listing not confirmed
            </span>
          )}
        </article>
      );
    })}
  </div>
);

export default PriceSummary;
