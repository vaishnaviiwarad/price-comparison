import SearchHistory from "../models/SearchHistory.js";
import { scrapeAmazonProduct } from "../scraper/amazonScraper.js";
import { getSharedBrowser } from "../scraper/browserManager.js";
import { scrapeCromaProduct } from "../scraper/cromaScraper.js";
import { logScraperDebug, logScraperError } from "../scraper/debug.js";
import { scrapeFlipkartProduct } from "../scraper/flipkartScraper.js";

const isAmazonUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    return /(^|\.)amazon\./i.test(parsedUrl.hostname) || /(^|\.)amzn\./i.test(parsedUrl.hostname);
  } catch (error) {
    return false;
  }
};

const EXTREME_LOW_RATIO = 0.35;
const EXTREME_HIGH_RATIO = 3.5;

const sanitizeExtremeStoreOutliers = (stores) =>
  stores.map((store, index, collection) => {
    if (typeof store.price !== "number") {
      return store;
    }

    const otherPrices = collection
      .filter((_, candidateIndex) => candidateIndex !== index)
      .map((candidate) => candidate.price)
      .filter((price) => typeof price === "number");

    if (!otherPrices.length) {
      return store;
    }

    const referencePrice =
      otherPrices.length === 1
        ? otherPrices[0]
        : [...otherPrices].sort((first, second) => first - second)[Math.floor(otherPrices.length / 2)];

    if (store.price < referencePrice * EXTREME_LOW_RATIO || store.price > referencePrice * EXTREME_HIGH_RATIO) {
      logScraperDebug("compare", "Rejected extreme store price outlier", {
        store: store.label,
        price: store.price,
        referencePrice,
        ratio: Number((store.price / referencePrice).toFixed(3))
      });

      return {
        ...store,
        price: null,
        url: ""
      };
    }

    return store;
  });

export const comparePrices = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: "Amazon product URL is required." });
  }

  if (!isAmazonUrl(url)) {
    return res.status(400).json({ message: "Please provide a valid Amazon product URL." });
  }

  try {
    logScraperDebug("compare", "Starting price comparison", {
      userId: req.user?.id,
      amazonUrl: url
    });

    const browser = await getSharedBrowser();

    const amazonProduct = await scrapeAmazonProduct(browser, url);
    logScraperDebug("compare", "Amazon scrape complete", {
      title: amazonProduct.title,
      price: amazonProduct.price,
      url: amazonProduct.url
    });

    const [flipkartProduct, cromaProduct] = await Promise.all([
      scrapeFlipkartProduct(browser, amazonProduct.title),
      scrapeCromaProduct(browser, amazonProduct.title)
    ]);

    logScraperDebug("compare", "Flipkart scrape result", flipkartProduct || {
      status: "no_confirmed_match",
      amazonTitle: amazonProduct.title
    });

    logScraperDebug("compare", "Croma scrape result", cromaProduct || {
      status: "no_confirmed_match",
      amazonTitle: amazonProduct.title
    });

    const sanitizedStores = sanitizeExtremeStoreOutliers([
      {
        label: "Amazon",
        price: amazonProduct.price,
        url: amazonProduct.url
      },
      {
        label: "Flipkart",
        price: flipkartProduct?.price ?? null,
        url: flipkartProduct?.url || ""
      },
      {
        label: "Croma",
        price: cromaProduct?.price ?? null,
        url: cromaProduct?.url || ""
      }
    ]);

    const amazonStore = sanitizedStores.find((store) => store.label === "Amazon");
    const flipkartStore = sanitizedStores.find((store) => store.label === "Flipkart");
    const cromaStore = sanitizedStores.find((store) => store.label === "Croma");

    const amazonPrice = amazonStore?.price ?? null;
    const flipkartPrice = flipkartStore?.price ?? null;
    const cromaPrice = cromaStore?.price ?? null;
    const hasFlipkartPrice = typeof flipkartPrice === "number";
    const hasCromaPrice = typeof cromaPrice === "number";

    const availablePrices = [
      { label: "Amazon", price: amazonPrice },
      { label: "Flipkart", price: flipkartPrice },
      { label: "Croma", price: cromaPrice }
    ].filter((entry) => typeof entry.price === "number");

    if (!availablePrices.length) {
      throw new Error("No confirmed store price could be validated.");
    }

    const lowestPrice = Math.min(...availablePrices.map((entry) => entry.price));
    const highestPrice = Math.max(...availablePrices.map((entry) => entry.price));
    const lowestStores = availablePrices
      .filter((entry) => entry.price === lowestPrice)
      .map((entry) => entry.label);
    const bestPrice = lowestStores.length === 1 ? lowestStores[0] : "Same Price";
    const priceDifference = highestPrice - lowestPrice;
    const matchedStoreCount = availablePrices.length;

    const comparison = {
      title: amazonProduct.title,
      image: amazonProduct.image,
      amazonPrice,
      flipkartPrice,
      cromaPrice,
      amazonUrl: amazonStore?.url || "",
      flipkartUrl: flipkartStore?.url || "",
      cromaUrl: cromaStore?.url || "",
      bestPrice,
      lowestStores,
      lowestPrice,
      priceDifference,
      comparisonStatus:
        hasFlipkartPrice && hasCromaPrice ? "complete" : matchedStoreCount > 1 ? "partial" : "amazon_only",
      message:
        hasFlipkartPrice && hasCromaPrice
          ? "Price comparison completed successfully."
          : matchedStoreCount > 1
            ? "Price comparison completed with available store matches."
            : "Amazon product found, but Flipkart and Croma matches could not be confirmed."
    };

    await SearchHistory.create({
      userId: req.user.id,
      productTitle: comparison.title,
      productImage: comparison.image,
      amazonUrl: comparison.amazonUrl,
      flipkartUrl: comparison.flipkartUrl,
      cromaUrl: comparison.cromaUrl,
      amazonPrice: comparison.amazonPrice,
      flipkartPrice: comparison.flipkartPrice,
      cromaPrice: comparison.cromaPrice,
      bestPrice: comparison.bestPrice,
      priceDifference: comparison.priceDifference
    });

    logScraperDebug("compare", "Comparison finished", {
      title: comparison.title,
      amazonPrice: comparison.amazonPrice,
      flipkartPrice: comparison.flipkartPrice,
      cromaPrice: comparison.cromaPrice,
      bestPrice: comparison.bestPrice,
      comparisonStatus: comparison.comparisonStatus
    });

    return res.status(200).json(comparison);
  } catch (error) {
    logScraperError("compare", "Comparison failed", error, {
      amazonUrl: url,
      userId: req.user?.id
    });

    return res.status(500).json({
      message: "Unable to compare prices at the moment.",
      error: error.message
    });
  }
};

export const getSearchHistory = async (req, res) => {
  try {
    const history = await SearchHistory.find({ userId: req.user.id })
      .sort({ searchedAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch search history.",
      error: error.message
    });
  }
};
