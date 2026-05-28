import { buildSearchQueries, normalizeWhitespace, scoreMatch } from "./flipkartScraper.js";
import { logScraperDebug, logScraperError } from "./debug.js";

const CROMA_CHANNEL_CODE = process.env.CROMA_CHANNEL_CODE || "400049";
const CROMA_SEARCH_URL = "https://api.croma.com/searchservices/v1/search";

const stripHtml = (value = "") => normalizeWhitespace(value.replace(/<[^>]+>/g, " "));

const buildCromaUrl = (value = "") => {
  if (!value) {
    return "";
  }

  return value.startsWith("http") ? value : `https://www.croma.com${value}`;
};

const buildCromaSearchApiUrl = (query) => {
  const params = new URLSearchParams({
    currentPage: "0",
    query: `${query}:relevance`,
    fields: "FULL",
    channel: "WEB",
    channelCode: CROMA_CHANNEL_CODE,
    spellOpt: "DEFAULT"
  });

  return `${CROMA_SEARCH_URL}?${params.toString()}`;
};

const toCromaCandidate = (product) => ({
  title: normalizeWhitespace(product.name || ""),
  price: product.price?.value ?? null,
  url: buildCromaUrl(product.url || ""),
  image: product.plpImage || "",
  rawText: normalizeWhitespace(
    [product.summary, stripHtml(product.quickViewDesc), product.productMessage, product.productMessage2]
      .filter(Boolean)
      .join(" ")
  ),
  code: product.code || "",
  manufacturer: normalizeWhitespace(product.manufacturer || ""),
  relevancyScore: product.relevancyScore ?? 0,
  rankingScore: product.rankingScore ?? 0
});

const fetchCromaSearchResults = async (query) => {
  const response = await fetch(buildCromaSearchApiUrl(query), {
    headers: {
      accept: "application/json, text/plain, */*",
      origin: "https://www.croma.com",
      referer: "https://www.croma.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Croma search request failed with status ${response.status}`);
  }

  return response.json();
};

export const scrapeCromaProduct = async (_browser, productTitle) => {
  const { sourceDetails, queries } = buildSearchQueries(productTitle);

  logScraperDebug("croma", "Prepared Croma search queries", {
    amazonTitle: productTitle,
    sourceDetails,
    queries
  });

  let bestRejectedCandidate = null;

  for (const query of queries) {
    try {
      logScraperDebug("croma", "Searching Croma", { query, channelCode: CROMA_CHANNEL_CODE });

      const data = await fetchCromaSearchResults(query);
      const scoredCandidates = (data.products || [])
        .map(toCromaCandidate)
        .filter((candidate) => candidate.title && typeof candidate.price === "number")
        .map((candidate) => ({
          ...candidate,
          score:
            scoreMatch(
              sourceDetails.matchTitle,
              `${candidate.title} ${candidate.rawText}`.trim(),
              sourceDetails
            ) +
            (candidate.code && sourceDetails.variantCodes?.includes(candidate.code.toLowerCase()) ? 0.35 : 0) +
            (candidate.manufacturer && candidate.manufacturer.toLowerCase() === sourceDetails.brand ? 0.1 : 0)
        }))
        .sort((first, second) => {
          if (second.score !== first.score) {
            return second.score - first.score;
          }

          if (second.relevancyScore !== first.relevancyScore) {
            return second.relevancyScore - first.relevancyScore;
          }

          if (first.price !== second.price) {
            return first.price - second.price;
          }

          return second.rankingScore - first.rankingScore;
        });

      logScraperDebug("croma", "Top Croma candidates", {
        query,
        candidateCount: scoredCandidates.length,
        topCandidates: scoredCandidates.slice(0, 5).map((candidate) => ({
          title: candidate.title,
          price: candidate.price,
          score: Number(candidate.score.toFixed(3)),
          url: candidate.url
        }))
      });

      const bestCandidate = scoredCandidates[0];

      if (!bestCandidate || bestCandidate.score < 0.75) {
        if (bestCandidate && (!bestRejectedCandidate || bestCandidate.score > bestRejectedCandidate.score)) {
          bestRejectedCandidate = bestCandidate;
        }

        logScraperDebug("croma", "No confident Croma match for query", {
          query,
          bestCandidate: bestCandidate
            ? {
                title: bestCandidate.title,
                score: Number(bestCandidate.score.toFixed(3)),
                price: bestCandidate.price
              }
            : null
        });
        continue;
      }

      logScraperDebug("croma", "Confirmed Croma match", bestCandidate);
      return bestCandidate;
    } catch (error) {
      logScraperError("croma", "Croma search query failed", error, { query });
    }
  }

  logScraperDebug("croma", "No Croma match confirmed after all queries", {
    amazonTitle: productTitle,
    attemptedQueries: queries,
    bestRejectedCandidate: bestRejectedCandidate
      ? {
          title: bestRejectedCandidate.title,
          score: Number(bestRejectedCandidate.score.toFixed(3)),
          price: bestRejectedCandidate.price,
          url: bestRejectedCandidate.url
        }
      : null
  });

  return null;
};
