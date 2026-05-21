const formatPrice = (price) =>
  typeof price === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(price)
    : "Not found";

const formatDateTime = (value) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
};

const HistoryList = ({ history, onSelect, loading = false }) => {
  if (!history.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-ink-700">
        Your recent comparisons will appear here after the first search.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <button
          type="button"
          key={item._id}
          onClick={() => onSelect(item)}
          disabled={loading}
          className="flex w-full flex-col gap-4 rounded-3xl border border-white/80 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-glow sm:flex-row sm:items-center"
        >
          <img
            src={item.productImage || "https://placehold.co/96x96?text=Product"}
            alt={item.productTitle}
            className="h-24 w-24 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink-900">{item.productTitle}</p>
            <p className="mt-2 text-sm text-ink-700">
              Amazon: {formatPrice(item.amazonPrice)} | Flipkart:{" "}
              {formatPrice(item.flipkartPrice)}
            </p>
            <p className="mt-1 text-sm text-brand-600">
              Best price: {item.bestPrice} | Difference: {formatPrice(item.priceDifference)}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              Last checked: {formatDateTime(item.searchedAt)}
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-700">
              {loading ? "Refreshing live prices..." : "Click to recheck live prices"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default HistoryList;
