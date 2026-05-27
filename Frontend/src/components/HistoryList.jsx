const formatPrice = (price) =>
  typeof price === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(price)
    : "Not found";

const stores = [
  { key: "amazon", label: "Amazon" },
  { key: "flipkart", label: "Flipkart" },
  { key: "croma", label: "Croma" }
];

const HistoryList = ({ history }) => {
  if (!history.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-6 text-sm text-ink-600">
        Your recent comparisons will appear here after the first search.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {history.map((item) => (
        <article
          key={item._id}
          className="panel animate-reveal p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-500/20"
        >
          <div className="flex gap-4">
            <img
              src={item.productImage || "https://placehold.co/96x96?text=Product"}
              alt={item.productTitle}
              className="h-24 w-24 rounded-2xl border border-white/10 bg-royal-950/80 object-cover"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="line-clamp-2 text-base font-semibold text-ink-900">
                  {item.productTitle}
                </p>
                <span className="rounded-full border border-brand-500/25 bg-brand-500/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-200">
                  {item.bestPrice}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-ink-600">
                Difference: {formatPrice(item.priceDifference)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {stores.map((store) => (
              <div
                key={store.key}
                className="rounded-2xl border border-white/10 bg-royal-950/55 px-4 py-3"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
                  {store.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink-900">
                  {formatPrice(item[`${store.key}Price`])}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
};

export default HistoryList;
