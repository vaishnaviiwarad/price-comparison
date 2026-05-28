import * as cheerio from "cheerio";
import { logScraperDebug, logScraperError } from "./debug.js";

const AMAZON_PRICE_SELECTORS = [
  {
    selector: "#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen",
    priority: 160
  },
  {
    selector: "#corePrice_feature_div .a-price:not(.a-text-price) .a-offscreen",
    priority: 155
  },
  {
    selector: "#corePrice_mobile_feature_div .a-price:not(.a-text-price) .a-offscreen",
    priority: 150
  },
  {
    selector: "#apex_desktop .a-price:not(.a-text-price) .a-offscreen",
    priority: 145
  },
  {
    selector: "#apex_offerDisplay_desktop .a-price:not(.a-text-price) .a-offscreen",
    priority: 140
  },
  {
    selector: "#priceblock_ourprice",
    priority: 135
  },
  {
    selector: "#priceblock_dealprice",
    priority: 130
  },
  {
    selector: "#price_inside_buybox",
    priority: 125
  }
];

const AMAZON_CONTEXT_ROOTS =
  "#corePriceDisplay_desktop_feature_div, #corePrice_feature_div, #corePrice_mobile_feature_div, " +
  "#apex_desktop, #apex_offerDisplay_desktop, #buyBoxAccordion, #buybox, #ppd";

const AMAZON_PRICE_REGION_SELECTORS = [
  {
    selector: "#corePriceDisplay_desktop_feature_div",
    priority: 140
  },
  {
    selector: "#corePrice_feature_div",
    priority: 135
  },
  {
    selector: "#apex_desktop",
    priority: 130
  },
  {
    selector: "#centerCol",
    priority: 95
  },
  {
    selector: "#desktop_buybox",
    priority: 90
  },
  {
    selector: "#buyBoxAccordion",
    priority: 85
  },
  {
    selector: "#rightCol",
    priority: 70
  },
  {
    selector: "#ppd",
    priority: 60
  }
];

const AMAZON_PRICE_PATTERN = /\u20B9\s?\d{1,3}(?:,\d{2,3})+|\u20B9\s?\d+(?:\.\d+)?/g;
const AMAZON_OFFER_CONTEXT =
  /exchange|trade[- ]?in|bank\s*offer|cashback|coupon|save\s*extra|buying\s*options|emi|no\s*cost|\/month|per\s*month|pay\s*later|partner\s*offer|upi|instant\s*bank|with\s*exchange|without\s*exchange|offer/i;
const AMAZON_SECONDARY_PRICE_CONTEXT =
  /mrp|list\s*price|you\s*save|recommended\s*price|delivery|shipping|inclusive\s*of\s*all\s*taxes/i;
const AMAZON_NOISY_PRICE_CONTEXT =
  /subtotal|selected options|initial payment breakdown|add laptop set-?up service|set-?up service|add these items|total price|see more|details price|price\s*:\s*₹|brand|model name|screen size|customer reviews|hard disk size|memory storage capacity/i;
const AMAZON_PRIMARY_PRICE_CONTEXT =
  /without exchange|with exchange|free delivery|fastest delivery|order within|in stock|add to cart|buy now|amazon'?s choice|bought in past month/i;

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const pickFirstText = ($, selectors) => {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const pickFirstAttr = ($, selectors, attribute) => {
  for (const selector of selectors) {
    const value = $(selector).first().attr(attribute)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const extractNumericPrice = (value) => {
  if (!value) {
    return null;
  }

  const numericValue = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const parsed = Number.parseFloat(numericValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const scoreAmazonPriceCandidate = (candidate) => {
  const context = normalizeWhitespace(candidate.context || "");
  let score = candidate.priority || 0;

  if (AMAZON_OFFER_CONTEXT.test(context)) {
    score -= 220;
  } else {
    score += 35;
  }

  if (AMAZON_SECONDARY_PRICE_CONTEXT.test(context)) {
    score -= 30;
  } else {
    score += 8;
  }

  if (AMAZON_NOISY_PRICE_CONTEXT.test(context)) {
    score -= 140;
  }

  if (AMAZON_PRIMARY_PRICE_CONTEXT.test(context)) {
    score += 36;
  }

  if (candidate.source === "body") {
    score -= 90;
  }

  if (candidate.source === "region") {
    score -= 15;
  }

  if (candidate.source === "selector") {
    score += 45;
  }

  if (candidate.numeric && candidate.numeric >= 500) {
    score += 6;
  }

  if (/\b(?:price|deal|limited\s*time|sale)\b/i.test(context)) {
    score += 12;
  }

  if (typeof candidate.index === "number" && candidate.index < 180) {
    score += 4;
  }

  return score;
};

const selectBestAmazonPriceCandidate = (candidates) => {
  if (!candidates.length) {
    return null;
  }

  const reasonableCandidates = candidates.filter((candidate) => candidate.numeric >= 50);
  const usableCandidates = reasonableCandidates.length ? reasonableCandidates : candidates;

  return [...usableCandidates].sort((first, second) => {
    const scoreDifference = scoreAmazonPriceCandidate(second) - scoreAmazonPriceCandidate(first);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    if ((first.index ?? Number.MAX_SAFE_INTEGER) !== (second.index ?? Number.MAX_SAFE_INTEGER)) {
      return (first.index ?? Number.MAX_SAFE_INTEGER) - (second.index ?? Number.MAX_SAFE_INTEGER);
    }

    return (first.priority || 0) - (second.priority || 0);
  })[0];
};

const buildPriceEntriesFromText = (value, source = "body", priority = 0) => {
  const normalizedValue = normalizeWhitespace(value);
  const matches = [...normalizedValue.matchAll(AMAZON_PRICE_PATTERN)];

  return matches
    .map((match) => {
      const text = normalizeWhitespace(match[0]);
      const numeric = extractNumericPrice(text);
      const index = match.index ?? 0;
      const context = normalizedValue.slice(
        Math.max(0, index - 42),
        Math.min(normalizedValue.length, index + text.length + 48)
      );

      return {
        text,
        numeric,
        index,
        context,
        source,
        priority
      };
    })
    .filter((entry) => entry.numeric);
};

const collectAmazonRegionCandidatesFromCheerio = ($) => {
  const candidates = [];

  for (const { selector, priority } of AMAZON_PRICE_REGION_SELECTORS) {
    $(selector).each((index, element) => {
      const text = normalizeWhitespace($(element).text());

      if (!text) {
        return;
      }

      candidates.push(
        ...buildPriceEntriesFromText(text, "region", priority).map((entry) => ({
          ...entry,
          selector,
          index: typeof entry.index === "number" ? entry.index + index * 100000 : entry.index
        }))
      );
    });
  }

  return candidates;
};

const collectAmazonPriceCandidatesFromCheerio = ($) => {
  const candidates = [];

  for (const { selector, priority } of AMAZON_PRICE_SELECTORS) {
    $(selector).each((index, element) => {
      const text = normalizeWhitespace($(element).text());
      if (!text) {
        return;
      }

      const contextRoot = $(element).closest(AMAZON_CONTEXT_ROOTS).first();
      const context = normalizeWhitespace(
        contextRoot.text() || $(element).parent().text() || $(element).closest("div").text() || text
      );

      candidates.push({
        text,
        numeric: extractNumericPrice(text),
        context,
        selector,
        source: "selector",
        priority,
        index
      });
    });
  }

  return candidates.filter((candidate) => candidate.numeric);
};

export const scrapeAmazonProduct = async (browser, url) => {
  const page = await browser.newPage();

  try {
    logScraperDebug("amazon", "Opening Amazon product page", { url });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "accept-language": "en-IN,en;q=0.9"
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForSelector("body", { timeout: 10000 });

    const pageTitle = await page.title();
    logScraperDebug("amazon", "Amazon page loaded", {
      pageTitle,
      finalUrl: page.url()
    });

    if (/robot check|captcha|sorry/i.test(pageTitle)) {
      throw new Error("Amazon blocked the request with a bot check.");
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    let title = normalizeWhitespace(pickFirstText($, ["#productTitle", "#title span", "h1 span"]));
    let image =
      pickFirstAttr($, ["#landingImage", "#imgBlkFront"], "src") ||
      pickFirstAttr($, ["#landingImage", "#imgBlkFront"], "data-old-hires") ||
      pickFirstAttr($, ["meta[property='og:image']"], "content");

    const selectorCandidates = collectAmazonPriceCandidatesFromCheerio($);
    const regionCandidates = collectAmazonRegionCandidatesFromCheerio($);

    const domData = await page.evaluate(
      ({ priceSelectors, regionSelectors, contextRoots }) => {
        const normalizeWhitespaceInPage = (value = "") => value.replace(/\s+/g, " ").trim();
        const extractNumericPriceInPage = (value) => {
          if (!value) {
            return null;
          }

          const numericValue = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
          const parsed = Number.parseFloat(numericValue);
          return Number.isFinite(parsed) ? parsed : null;
        };

        const buildBodyEntries = () => {
          const bodyText = normalizeWhitespaceInPage(document.body.innerText || "");
          const matches = [
            ...bodyText.matchAll(/\u20B9\s?\d{1,3}(?:,\d{2,3})+|\u20B9\s?\d+(?:\.\d+)?/g)
          ];

          return matches
            .map((match) => {
              const text = normalizeWhitespaceInPage(match[0]);
              const numeric = extractNumericPriceInPage(text);
              const index = match.index ?? 0;
              const context = bodyText.slice(
                Math.max(0, index - 42),
                Math.min(bodyText.length, index + text.length + 48)
              );

              return {
                text,
                numeric,
                index,
                context,
                source: "body",
                priority: 10
              };
            })
            .filter((entry) => entry.numeric);
        };

        const buildRegionEntries = () =>
          regionSelectors.flatMap(({ selector, priority }) =>
            Array.from(document.querySelectorAll(selector)).flatMap((element, regionIndex) =>
              buildBodyEntriesFromText(element.innerText || element.textContent || "", "region", priority).map(
                (entry) => ({
                  ...entry,
                  selector,
                  index: typeof entry.index === "number" ? entry.index + regionIndex * 100000 : entry.index
                })
              )
            )
          );

        const buildBodyEntriesFromText = (value, source = "body", priority = 10) => {
          const normalizedValue = normalizeWhitespaceInPage(value);
          const matches = [
            ...normalizedValue.matchAll(/\u20B9\s?\d{1,3}(?:,\d{2,3})+|\u20B9\s?\d+(?:\.\d+)?/g)
          ];

          return matches
            .map((match) => {
              const text = normalizeWhitespaceInPage(match[0]);
              const numeric = extractNumericPriceInPage(text);
              const index = match.index ?? 0;
              const context = normalizedValue.slice(
                Math.max(0, index - 42),
                Math.min(normalizedValue.length, index + text.length + 48)
              );

              return {
                text,
                numeric,
                index,
                context,
                source,
                priority
              };
            })
            .filter((entry) => entry.numeric);
        };

        const selectorCandidates = priceSelectors.flatMap(({ selector, priority }) =>
          Array.from(document.querySelectorAll(selector))
            .map((element, index) => {
              const text = normalizeWhitespaceInPage(element.textContent || "");
              const root =
                element.closest(contextRoots) ||
                element.parentElement ||
                element.closest("div") ||
                element;
              const context = normalizeWhitespaceInPage(root.textContent || text);

              return {
                text,
                numeric: extractNumericPriceInPage(text),
                context,
                selector,
                source: "selector",
                priority,
                index
              };
            })
            .filter((candidate) => candidate.text && candidate.numeric)
        );

        const textFromSelectors = (selectors) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            const text = normalizeWhitespaceInPage(element?.textContent || "");
            if (text) {
              return text;
            }
          }

          return "";
        };

        const attrFromSelectors = (selectors, attribute) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            const value = element?.getAttribute(attribute)?.trim();
            if (value) {
              return value;
            }
          }

          return "";
        };

        return {
          title: textFromSelectors(["#productTitle", "#title span", "h1 span"]),
          image:
            attrFromSelectors(["#landingImage", "#imgBlkFront"], "src") ||
            attrFromSelectors(["#landingImage", "#imgBlkFront"], "data-old-hires") ||
            attrFromSelectors(["meta[property='og:image']"], "content"),
          selectorCandidates,
          regionCandidates: buildRegionEntries(),
          bodyCandidates: buildBodyEntries()
        };
      },
      {
        priceSelectors: AMAZON_PRICE_SELECTORS,
        regionSelectors: AMAZON_PRICE_REGION_SELECTORS,
        contextRoots: AMAZON_CONTEXT_ROOTS
      }
    );

    title = title || normalizeWhitespace(domData.title);
    image = image || domData.image;

    const domSelectorCandidates = domData.selectorCandidates || [];
    const domRegionCandidates = domData.regionCandidates || [];
    const domBodyCandidates = domData.bodyCandidates || [];
    const priceCandidates = [
      ...selectorCandidates,
      ...domSelectorCandidates,
      ...(selectorCandidates.length || domSelectorCandidates.length
        ? []
        : regionCandidates.length || domRegionCandidates.length
          ? [...regionCandidates, ...domRegionCandidates]
          : domBodyCandidates)
    ];
    const bestPriceCandidate = selectBestAmazonPriceCandidate(priceCandidates);
    const price = bestPriceCandidate?.numeric ?? null;

    logScraperDebug("amazon", "Amazon price candidates ranked", {
      candidateCount: priceCandidates.length,
      topCandidates: [...priceCandidates]
        .sort((first, second) => scoreAmazonPriceCandidate(second) - scoreAmazonPriceCandidate(first))
        .slice(0, 5)
        .map((candidate) => ({
          text: candidate.text,
          numeric: candidate.numeric,
          score: scoreAmazonPriceCandidate(candidate),
          source: candidate.source,
          selector: candidate.selector || "",
          context: candidate.context
        })),
      selectedCandidate: bestPriceCandidate
        ? {
            text: bestPriceCandidate.text,
            numeric: bestPriceCandidate.numeric,
            score: scoreAmazonPriceCandidate(bestPriceCandidate),
            source: bestPriceCandidate.source,
            selector: bestPriceCandidate.selector || "",
            context: bestPriceCandidate.context
          }
        : null
    });

    if (!title || !price) {
      throw new Error("Could not extract Amazon product details.");
    }

    logScraperDebug("amazon", "Amazon product extracted", {
      title,
      price,
      image,
      finalUrl: page.url()
    });

    return {
      title,
      image,
      price,
      url: page.url()
    };
  } catch (error) {
    logScraperError("amazon", "Amazon scrape failed", error, {
      requestedUrl: url,
      currentUrl: page.url()
    });
    throw error;
  } finally {
    await page.close();
  }
};
