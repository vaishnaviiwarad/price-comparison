import * as cheerio from "cheerio";
import { logScraperDebug, logScraperError } from "./debug.js";

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

    let title = pickFirstText($, ["#productTitle", "#title span", "h1 span"]);
    let image = pickFirstAttr(
      $,
      ["#landingImage", "#imgBlkFront", "meta[property='og:image']"],
      "src"
    );

    if (!image) {
      image = pickFirstAttr(
        $,
        ["#landingImage", "#imgBlkFront", "meta[property='og:image']"],
        "content"
      );
    }

    let priceText = pickFirstText($, [
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      "#corePrice_feature_div .a-price .a-offscreen",
      ".a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice"
    ]);

    let price = extractNumericPrice(priceText);

    if (!title || !price || !image) {
      const domData = await page.evaluate(() => {
        const textFromSelectors = (selectors) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            const text = element?.textContent?.trim();
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
            attrFromSelectors(["#landingImage", "#imgBlkFront"], "data-old-hires"),
          priceText: textFromSelectors([
            "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
            "#corePrice_feature_div .a-price .a-offscreen",
            ".a-price .a-offscreen",
            "#priceblock_ourprice",
            "#priceblock_dealprice"
          ])
        };
      });

      title = title || domData.title;
      image = image || domData.image;
      priceText = priceText || domData.priceText;
      price = price || extractNumericPrice(domData.priceText);
    }

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
