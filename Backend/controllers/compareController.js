import puppeteer from "puppeteer";
import SearchHistory from "../models/SearchHistory.js";
import { scrapeAmazonProduct } from "../scraper/amazonScraper.js";
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

const launchBrowser = async () =>
  puppeteer.launch({
    headless: process.env.HEADLESS !== "false",
    defaultViewport: {
      width: 1366,
      height: 900
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

export const comparePrices = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: "Amazon product URL is required." });
  }

  if (!isAmazonUrl(url)) {
    return res.status(400).json({ message: "Please provide a valid Amazon product URL." });
  }

  let browser;

  try {
    logScraperDebug("compare", "Starting price comparison", {
      userId: req.user?.id,
      amazonUrl: url
    });

    browser = await launchBrowser();

    const amazonProduct = await scrapeAmazonProduct(browser, url);
    logScraperDebug("compare", "Amazon scrape complete", {
      title: amazonProduct.title,
      price: amazonProduct.price,
      url: amazonProduct.url
    });

    const flipkartProduct = await scrapeFlipkartProduct(browser, amazonProduct.title);
    logScraperDebug("compare", "Flipkart scrape result", flipkartProduct || {
      status: "no_confirmed_match",
      amazonTitle: amazonProduct.title
    });

    const amazonPrice = amazonProduct.price;
    const flipkartPrice = flipkartProduct?.price ?? null;
    const hasFlipkartPrice = typeof flipkartPrice === "number";

    let lowestPrice = amazonPrice;
    let bestPrice = "Amazon";
    let priceDifference = 0;

    if (hasFlipkartPrice) {
      priceDifference = Math.abs(amazonPrice - flipkartPrice);

      if (flipkartPrice < amazonPrice) {
        lowestPrice = flipkartPrice;
        bestPrice = "Flipkart";
      } else if (flipkartPrice === amazonPrice) {
        bestPrice = "Same Price";
      }
    }

    const comparison = {
      title: amazonProduct.title,
      image: amazonProduct.image,
      amazonPrice,
      flipkartPrice,
      amazonUrl: amazonProduct.url,
      flipkartUrl: flipkartProduct?.url || "",
      bestPrice,
      lowestPrice,
      priceDifference,
      comparisonStatus: hasFlipkartPrice ? "complete" : "partial",
      message: hasFlipkartPrice
        ? "Price comparison completed successfully."
        : "Amazon product found, but a Flipkart match could not be confirmed."
    };

    await SearchHistory.create({
      userId: req.user.id,
      productTitle: comparison.title,
      productImage: comparison.image,
      amazonUrl: comparison.amazonUrl,
      flipkartUrl: comparison.flipkartUrl,
      amazonPrice: comparison.amazonPrice,
      flipkartPrice: comparison.flipkartPrice,
      bestPrice: comparison.bestPrice,
      priceDifference: comparison.priceDifference
    });

    logScraperDebug("compare", "Comparison finished", {
      title: comparison.title,
      amazonPrice: comparison.amazonPrice,
      flipkartPrice: comparison.flipkartPrice,
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
  } finally {
    if (browser) {
      await browser.close();
    }
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
