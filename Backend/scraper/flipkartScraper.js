import * as cheerio from "cheerio";
import { logScraperDebug, logScraperError } from "./debug.js";

const ACCESSORY_KEYWORDS = [
  "tempered",
  "glass",
  "guard",
  "cover",
  "case",
  "screen",
  "protector",
  "privacy",
  "panel",
  "back panel",
  "skin",
  "camera lens",
  "charger",
  "cable",
  "adapter"
];

const QUERY_STOPWORDS = new Set([
  "new",
  "launch",
  "latest",
  "edition",
  "special",
  "wireless",
  "true",
  "ear",
  "in",
  "the",
  "with",
  "w",
  "audio",
  "premium",
  "design",
  "playtime",
  "fast",
  "charge",
  "driver",
  "drivers",
  "latency",
  "bluetooth"
]);

const QUERY_CATEGORY_WORDS = new Set([
  "earbuds",
  "earphones",
  "headphones",
  "headset",
  "speaker",
  "styler",
  "straightener",
  "curler",
  "crimper",
  "dryer",
  "trimmer",
  "epilator",
  "shaver",
  "laptop",
  "mobile",
  "phone",
  "watch",
  "tablet",
  "camera",
  "monitor",
  "tv",
  "printer",
  "mouse",
  "keyboard",
  "smartphone"
]);

const PHONE_BRANDS = new Set([
  "apple",
  "google",
  "honor",
  "infinix",
  "iqoo",
  "iphone",
  "lava",
  "motorola",
  "nokia",
  "nothing",
  "oneplus",
  "oppo",
  "pixel",
  "poco",
  "realme",
  "redmi",
  "samsung",
  "tecno",
  "vivo",
  "xiaomi"
]);

const PHONE_VARIANT_TOKENS = new Set([
  "air",
  "edge",
  "fe",
  "lite",
  "max",
  "mini",
  "neo",
  "note",
  "plus",
  "pro",
  "se",
  "ultra"
]);

const PHONE_NOISE_TOKENS = new Set(["5g", "ai", "smartphone", "phone", "mobile"]);
const COMPUTER_BRANDS = new Set([
  "acer",
  "apple",
  "asus",
  "avita",
  "dell",
  "gigabyte",
  "honor",
  "hp",
  "infinix",
  "lenovo",
  "lg",
  "msi",
  "realme",
  "samsung",
  "vaio"
]);
const LAPTOP_HINT_TOKENS = new Set([
  "chromebook",
  "desktop",
  "laptop",
  "macbook",
  "notebook",
  "ssd",
  "windows"
]);
const LAPTOP_PROCESSOR_CONTEXT = /\b(?:intel|amd|core|ryzen|celeron|pentium|athlon|ultra|snapdragon|processor)\b/i;
const NON_SKU_TOKENS = new Set([
  "anti",
  "basic",
  "black",
  "blue",
  "ddr4",
  "ddr5",
  "fhd",
  "glare",
  "gold",
  "gray",
  "green",
  "home24",
  "ipx4",
  "micro",
  "office24",
  "silver",
  "white",
  "win10",
  "win11"
]);
const COLOR_TOKENS = new Set([
  "ash",
  "azure",
  "beige",
  "black",
  "blazing",
  "blue",
  "bronze",
  "carbon",
  "charcoal",
  "comet",
  "coral",
  "crimson",
  "crystal",
  "cyan",
  "deep",
  "desert",
  "elegance",
  "gold",
  "gray",
  "green",
  "grey",
  "ice",
  "indigo",
  "ivory",
  "lavender",
  "lilac",
  "light",
  "lights",
  "marine",
  "midnight",
  "mint",
  "mocha",
  "navy",
  "northern",
  "pearl",
  "pink",
  "platinum",
  "purple",
  "quartz",
  "red",
  "rose",
  "sabre",
  "serenity",
  "shadow",
  "silver",
  "silverblue",
  "space",
  "steel",
  "sunset",
  "titanium",
  "white",
  "whitesilver",
  "wine",
  "yellow"
]);

const SEARCH_CARD_TITLE_SELECTORS = [".KzDlHZ", ".wjcEIp", ".IRpwTa", "[title]"];
const SEARCH_CARD_PRICE_SELECTORS = [".Nx9bqj", "._30jeq3"];
const PRODUCT_PAGE_TITLE_SELECTORS = ["span.VU-ZEz", "span.B_NuCI", "h1 span"];
const PRODUCT_PAGE_PRICE_SELECTORS = [
  "a._1psv1zeb9",
  "div._1psv1zeb9._1psv1ze0",
  "div._1psv1zeb9",
  "._30jeq3",
  ".Nx9bqj"
];

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const normalizeCompactText = (value = "") => normalizeWhitespace(value).toLowerCase().replace(/\s+/g, "");

const sanitizeProductTitle = (value = "") =>
  normalizeWhitespace(value)
    .replace(/^add to compare\s*/i, "")
    .replace(/\bAdd to Compare\b/gi, " ")
    .replace(/\bBestseller\b/gi, " ")
    .trim();

const canonicalizeFlipkartProductUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    const nextParams = new URLSearchParams();

    if (parsedUrl.searchParams.has("pid")) {
      nextParams.set("pid", parsedUrl.searchParams.get("pid"));
    }

    if (parsedUrl.searchParams.has("lid")) {
      nextParams.set("lid", parsedUrl.searchParams.get("lid"));
    }

    const queryString = nextParams.toString();
    return `${parsedUrl.origin}${parsedUrl.pathname}${queryString ? `?${queryString}` : ""}`;
  } catch (error) {
    return url;
  }
};

const extractCurrencyMatches = (value) =>
  normalizeWhitespace(value).match(/\u20B9\s?\d{1,3}(?:,\d{2,3})+|\u20B9\s?\d+(?:\.\d+)?/g) || [];

const getPriceEntriesFromText = (value) => {
  const normalizedValue = normalizeWhitespace(value);
  const matches = [...normalizedValue.matchAll(/\u20B9\s?\d{1,3}(?:,\d{2,3})+|\u20B9\s?\d+(?:\.\d+)?/g)];

  return matches
    .map((match) => {
      const numeric = extractNumericPrice(match[0]);
      const index = match.index ?? 0;
      const context = normalizedValue.slice(
        Math.max(0, index - 24),
        Math.min(normalizedValue.length, index + match[0].length + 28)
      );

      return {
        text: match[0],
        numeric,
        index,
        context
      };
    })
    .filter((entry) => entry.numeric);
};

const extractNumericPrice = (value) => {
  if (!value) {
    return null;
  }

  const numericValue = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const parsed = Number.parseFloat(numericValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTitle = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);

const removeMarketingPhrases = (value) =>
  normalizeWhitespace(
    value
      .replace(/\bnew launch\b/gi, " ")
      .replace(/\blatest launch\b/gi, " ")
      .replace(/\bjust launched\b/gi, " ")
      .replace(/\bspecial edition\b/gi, " ")
      .replace(/\blimited edition\b/gi, " ")
  );

const appendUniqueQueryParts = (baseQuery, extraParts) => {
  const baseTokens = new Set(normalizeTitle(baseQuery));
  const missingParts = extraParts.filter((part) =>
    normalizeTitle(part).some((token) => !baseTokens.has(token))
  );

  return normalizeWhitespace([baseQuery, ...missingParts].filter(Boolean).join(" "));
};

const buildCompactTokens = (tokens) => tokens.filter((token) => !QUERY_STOPWORDS.has(token));

const findCategoryToken = (tokens) => tokens.find((token) => QUERY_CATEGORY_WORDS.has(token)) || "";

const isModelNumberToken = (token) => /^(?:[a-z]*\d+[a-z]*|\d+[a-z]+)$/i.test(token);

const isLikelySkuCode = (token) => {
  const compactToken = token.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (compactToken.length < 6 || compactToken.length > 18) {
    return false;
  }

  if (!/[a-z]{2,}/.test(compactToken) || !/\d{2,}/.test(compactToken)) {
    return false;
  }

  if (NON_SKU_TOKENS.has(compactToken)) {
    return false;
  }

  if (/^(?:\d+gb|\d+tb|\d+hz|\d+mp|\d+cm|\d+yr)$/i.test(compactToken)) {
    return false;
  }

  if (/^(?:office|windows|win|home|basic|black|silver|blue|green|white)/i.test(compactToken)) {
    return false;
  }

  return true;
};

const extractVariantCodes = (value) => {
  const candidates = normalizeWhitespace(value)
    .split(/[\s,()/]+/)
    .flatMap((token) => token.split("/"))
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => isLikelySkuCode(token));

  return [...new Set(candidates.map((token) => token.toLowerCase()))];
};

const extractProcessorTokens = (value) => {
  if (!LAPTOP_PROCESSOR_CONTEXT.test(value)) {
    return [];
  }

  const normalizedValue = normalizeWhitespace(value);
  const matches = [
    ...normalizedValue.matchAll(
      /\b(?:core\s+\w+\s+|ryzen\s+\d+\s+|celeron(?:\s+dual\s+core)?\s+|pentium\s+|athlon\s+|ultra\s+)?([a-z]?\d{3,5}[a-z]{1,2})\b/gi
    )
  ];

  return [
    ...new Set(
      matches
        .map((match) => match[1]?.toLowerCase() || "")
        .filter((token) => token.length >= 4)
        .filter((token) => !/\d+(?:gb|tb|hz|mp|cm)$/i.test(token))
    )
  ];
};

const isOfferPriceContext = (context = "") =>
  /exchange|bank\s*offer|protect\s*promise|buy\s*at|apply\s*offers?/i.test(context);

const extractColor = (value) => {
  const normalizedValue = normalizeWhitespace(value);
  const semicolonParts = normalizedValue.split(";").map((part) => part.trim()).filter(Boolean);

  if (semicolonParts.length > 1) {
    const trailingSegment = semicolonParts.at(-1);
    if (/^[A-Za-z ]{3,30}$/.test(trailingSegment)) {
      return trailingSegment;
    }
  }

  const genericBracketMatch = normalizedValue.match(/\(([^)]+)\)/);
  if (!genericBracketMatch) {
    return "";
  }

  const bracketText = genericBracketMatch[1].trim();
  const bracketParts = bracketText
    .split(",")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  const descriptivePart = bracketParts.find(
    (part) =>
      /^[A-Za-z ]{3,40}$/.test(part) &&
      !/\b(?:ram|storage|rom|ssd|hdd|memory|gb|tb)\b/i.test(part)
  );

  if (descriptivePart) {
    return descriptivePart;
  }

  if (/^[A-Za-z ]{3,30}$/.test(bracketText)) {
    return bracketText;
  }

  return "";
};

const extractStorage = (value) => {
  const matches = [...value.matchAll(/\b(\d+(?:\.\d+)?)\s?(TB|GB)\b/gi)];

  if (!matches.length) {
    return "";
  }

  const scoredMatches = matches
    .map((match) => {
      const amount = Number.parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const token = normalizeWhitespace(`${match[1]} ${unit}`);
      const startIndex = match.index ?? 0;
      const context = value.slice(
        Math.max(0, startIndex - 18),
        Math.min(value.length, startIndex + match[0].length + 22)
      );

      let score = 0;

      if (/\b(?:storage|rom|ssd|hdd|internal|memory)\b/i.test(context)) {
        score += 4;
      }

      if (/\bram\b/i.test(context)) {
        score -= 5;
      }

      if (unit === "TB") {
        score += 1;
      }

      return {
        score,
        token,
        startIndex,
        capacityInGb: amount * (unit === "TB" ? 1024 : 1)
      };
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (second.capacityInGb !== first.capacityInGb) {
        return second.capacityInGb - first.capacityInGb;
      }

      return first.startIndex - second.startIndex;
    });

  return scoredMatches[0]?.token || "";
};

const extractVariantCode = (value) =>
  value.match(/\b[A-Za-z]{2,}[A-Za-z0-9]*-\d+[A-Za-z0-9-]*\b/)?.[0]?.toLowerCase() || "";

const hasMultipackWords = (value) => /\b(set of|combo|pack of|set)\b/i.test(value);

const hasMiniWord = (value) => /\bmini\b/i.test(value);

const extractColorTokens = (value = "") => normalizeTitle(value).filter((token) => COLOR_TOKENS.has(token));

const isColorMatch = (sourceColor, candidateText) => {
  if (!sourceColor || !candidateText) {
    return false;
  }

  const sourceCompactColor = normalizeCompactText(sourceColor);
  const candidateCompactText = normalizeCompactText(candidateText);

  if (sourceCompactColor && candidateCompactText.includes(sourceCompactColor)) {
    return true;
  }

  const sourceColorTokens = extractColorTokens(sourceColor);
  if (!sourceColorTokens.length) {
    return false;
  }

  const candidateTokens = new Set(normalizeTitle(candidateText));
  return sourceColorTokens.every((token) => candidateTokens.has(token));
};

const hasConflictingColor = (sourceColor, candidateText) => {
  if (!sourceColor || !candidateText || isColorMatch(sourceColor, candidateText)) {
    return false;
  }

  const sourceColorTokens = new Set(extractColorTokens(sourceColor));
  if (!sourceColorTokens.size) {
    return false;
  }

  const candidateColorTokens = extractColorTokens(candidateText);
  return candidateColorTokens.some((token) => !sourceColorTokens.has(token));
};

const extractSelectedColor = (bodyText) => {
  const selectedColor =
    normalizeWhitespace(bodyText)
      .match(/\bSelected Color:\s*([A-Za-z][A-Za-z ]{1,40})\b/i)?.[1] || "";

  return normalizeWhitespace(selectedColor.replace(/\bVisit brand store\b.*$/i, ""));
};

const isPhoneLikeTitle = (normalizedTitle, tokens) =>
  tokens.some((token) => PHONE_BRANDS.has(token)) &&
  (/\b(?:smartphone|phone|mobile|5g)\b/i.test(normalizedTitle) ||
    tokens.some((token) => PHONE_VARIANT_TOKENS.has(token) || isModelNumberToken(token)));

const isLaptopLikeTitle = (normalizedTitle, tokens) =>
  tokens.some((token) => COMPUTER_BRANDS.has(token)) &&
  (/\b(?:laptop|notebook|macbook|chromebook)\b/i.test(normalizedTitle) ||
    tokens.some((token) => LAPTOP_HINT_TOKENS.has(token)) ||
    LAPTOP_PROCESSOR_CONTEXT.test(normalizedTitle));

const buildStrictTokens = (tokens, categoryToken, { isPhoneLike = false } = {}) => {
  if (isPhoneLike) {
    const strictTokens = [];

    for (const token of tokens) {
      if (PHONE_NOISE_TOKENS.has(token)) {
        continue;
      }

      if (!strictTokens.includes(token)) {
        strictTokens.push(token);
      }

      if (strictTokens.length >= 4) {
        break;
      }
    }

    const preferredTokens = tokens.filter(
      (token) => PHONE_VARIANT_TOKENS.has(token) || isModelNumberToken(token)
    );

    for (const token of preferredTokens) {
      if (!strictTokens.includes(token)) {
        strictTokens.push(token);
      }
    }

    return strictTokens.slice(0, 5);
  }

  const strictTokens = tokens.filter((token) => token !== categoryToken).slice(0, 3);

  if (categoryToken && !strictTokens.includes(categoryToken)) {
    strictTokens.push(categoryToken);
  }

  return strictTokens;
};

const extractTitleFromText = (value) => {
  const normalizedValue = sanitizeProductTitle(value)
    .replace(/\b(Currently unavailable|Out of stock|Add to Compare|Bestseller|Trending)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const iphoneMatch = normalizedValue.match(/Apple iPhone[^₹\u20B9]*?\([^)]*\)/i);
  if (iphoneMatch) {
    return normalizeWhitespace(iphoneMatch[0]);
  }

  const beforePrice =
    normalizedValue.match(
      /^(.+?)(?=(?:\d(?:\.\d+)?\s*[\d,]*\s*Ratings?|\u20B9|Only few left|Bank Offer|Special Price))/i
    )?.[1] || normalizedValue;

  const cleaned = sanitizeProductTitle(beforePrice).replace(/^[-:|]+|[-:|]+$/g, "").trim();
  return cleaned.length >= 4 && cleaned.length <= 180 ? cleaned : "";
};

const pickFirstPriceFromText = (value) => {
  const prices = getPriceEntriesFromText(value);
  const nonOfferPrices = prices.filter(
    (entry) => !isOfferPriceContext(entry.context)
  );
  const candidatePrices = nonOfferPrices.length ? nonOfferPrices : prices;
  const reasonablePrices = candidatePrices.filter((entry) => entry.numeric >= 50);
  const rankedPrices = (reasonablePrices.length ? reasonablePrices : candidatePrices).sort((first, second) => {
    if (first.numeric !== second.numeric) {
      return first.numeric - second.numeric;
    }

    return first.index - second.index;
  });

  return rankedPrices[0]?.text || "";
};

const buildGenericDetails = (normalizedTitle, color, storage, variantCode) => {
  const withoutVariant = normalizeWhitespace(
    normalizedTitle.replace(/\([^)]*\)/g, " ").replace(/;.*$/g, " ")
  );
  const fullTokens = buildCompactTokens(normalizeTitle(removeMarketingPhrases(withoutVariant)));
  const laptopLike = isLaptopLikeTitle(normalizedTitle, fullTokens);
  const variantCodes = extractVariantCodes(normalizedTitle);
  const processorTokens = laptopLike ? extractProcessorTokens(normalizedTitle) : [];
  const mainClauseSource = laptopLike
    ? withoutVariant.split(",").slice(0, 3).join(" ")
    : withoutVariant.split(",")[0];
  const mainClause = removeMarketingPhrases(
    mainClauseSource.split(/\b(?:with|w\/)\b/i)[0]
  );
  const mainTokens = buildCompactTokens(normalizeTitle(mainClause));
  const categoryToken = findCategoryToken(mainTokens);
  const phoneLike = isPhoneLikeTitle(normalizedTitle, mainTokens);

  if (laptopLike) {
    const brand = fullTokens.find((token) => COMPUTER_BRANDS.has(token)) || fullTokens[0] || "";
    const familyToken =
      fullTokens.find(
        (token) =>
          token !== brand &&
          !QUERY_CATEGORY_WORDS.has(token) &&
          !processorTokens.includes(token) &&
          !variantCodes.includes(token) &&
          !isModelNumberToken(token)
      ) || "";
    const sizeToken = fullTokens.find((token) => /^\d{2}[a-z]?$/i.test(token)) || "";
    const strictTokens = [brand, sizeToken, ...processorTokens.slice(0, 1), ...variantCodes.slice(0, 1)]
      .filter(Boolean)
      .slice(0, 4);
    const requiredTokens = [...processorTokens, ...variantCodes].filter(Boolean);
    const primaryQuery = normalizeWhitespace(
      [brand, ...variantCodes.slice(0, 1), ...processorTokens.slice(0, 1)].filter(Boolean).join(" ")
    );
    const secondaryQuery = normalizeWhitespace(
      [brand, sizeToken, ...processorTokens.slice(0, 1), storage, ...variantCodes.slice(0, 2)]
        .filter(Boolean)
        .join(" ")
    );

    return {
      brand,
      familyToken,
      model: "",
      color,
      storage,
      variantCode: variantCode || variantCodes[0] || "",
      variantCodes,
      processorTokens,
      requiredTokens,
      isPhoneLike: false,
      isLaptopLike: true,
      isMultipack: hasMultipackWords(normalizedTitle),
      isMini: hasMiniWord(normalizedTitle),
      primaryQuery,
      secondaryQuery,
      strictTokens,
      primaryNumericToken: processorTokens[0] || sizeToken || "",
      matchTitle:
        normalizeWhitespace([primaryQuery, ...variantCodes.slice(1), storage].filter(Boolean).join(" ")) ||
        normalizedTitle
    };
  }

  const compactMainTokens = mainTokens.filter((token) => token !== categoryToken);
  const strictTokens = buildStrictTokens(compactMainTokens, categoryToken, {
    isPhoneLike: phoneLike
  });
  const primaryQuery = normalizeWhitespace(strictTokens.join(" "));
  const secondaryQuery = normalizeWhitespace(fullTokens.slice(0, 6).join(" "));
  const brand = strictTokens[0] || fullTokens[0] || "";
  const familyToken =
    strictTokens.find(
      (token, index) =>
        index > 0 &&
        !/\d/.test(token) &&
        token !== categoryToken &&
        !PHONE_VARIANT_TOKENS.has(token)
    ) || "";
  const primaryNumericToken = strictTokens.find((token) => isModelNumberToken(token)) || "";
  const requiredTokens = strictTokens.filter(
    (token) =>
      PHONE_VARIANT_TOKENS.has(token) ||
      (phoneLike &&
        token !== brand &&
        token !== familyToken &&
        token !== primaryNumericToken &&
        !PHONE_NOISE_TOKENS.has(token))
  );
  const model = phoneLike ? primaryQuery : "";

  return {
    brand,
    familyToken,
    model,
    color,
    storage,
    variantCode,
    variantCodes,
    processorTokens,
    requiredTokens,
    isPhoneLike: phoneLike,
    isLaptopLike: false,
    isMultipack: hasMultipackWords(normalizedTitle),
    isMini: hasMiniWord(normalizedTitle),
    primaryQuery,
    secondaryQuery,
    strictTokens,
    primaryNumericToken,
    matchTitle: primaryQuery || secondaryQuery || normalizedTitle
  };
};

const extractSourceDetails = (productTitle) => {
  const normalizedTitle = normalizeWhitespace(productTitle);
  const model =
    normalizedTitle.match(
      /\b(?:Apple\s+)?iPhone\s+\d+(?:\s+Pro\s+Max|\s+Pro|\s+Plus|\s+Mini)?\b/i
    )?.[0] || "";
  const color = extractColor(normalizedTitle);
  const storage = extractStorage(normalizedTitle);
  const variantCodes = extractVariantCodes(normalizedTitle);
  const variantCode = variantCodes[0] || extractVariantCode(normalizedTitle);

  if (model) {
    const primaryTokens = normalizeTitle([model, color, storage].filter(Boolean).join(" "));
    return {
      brand: "apple",
      familyToken:
        primaryTokens.find((token, index) => index > 0 && !/\d/.test(token) && token !== "apple") || "",
      model,
      color,
      storage,
      variantCode,
      variantCodes,
      processorTokens: [],
      isMultipack: hasMultipackWords(normalizedTitle),
      isMini: hasMiniWord(normalizedTitle),
      primaryQuery: normalizeWhitespace([model, color, storage].filter(Boolean).join(" ")),
      secondaryQuery: normalizeWhitespace([model, storage].filter(Boolean).join(" ")),
      strictTokens: primaryTokens,
      primaryNumericToken: primaryTokens.find((token) => isModelNumberToken(token)) || "",
      requiredTokens: primaryTokens.filter((token) => PHONE_VARIANT_TOKENS.has(token)),
      isPhoneLike: true,
      isLaptopLike: false,
      matchTitle:
        normalizeWhitespace([model, color, storage].filter(Boolean).join(" ")) || normalizedTitle
    };
  }

  return buildGenericDetails(normalizedTitle, color, storage, variantCode);
};

const buildSearchQueries = (productTitle) => {
  const sourceDetails = extractSourceDetails(productTitle);
  const conciseTokens = sourceDetails.strictTokens.slice(0, 3).join(" ");
  const queries = [
    ...sourceDetails.variantCodes.map((code) =>
      normalizeWhitespace([sourceDetails.brand, code, sourceDetails.processorTokens?.[0]].filter(Boolean).join(" "))
    ),
    appendUniqueQueryParts(sourceDetails.primaryQuery, [
      sourceDetails.color,
      sourceDetails.storage,
      sourceDetails.variantCode
    ]),
    sourceDetails.primaryQuery,
    normalizeWhitespace([conciseTokens, sourceDetails.color, sourceDetails.variantCode].filter(Boolean).join(" ")),
    conciseTokens,
    sourceDetails.secondaryQuery,
    removeMarketingPhrases(productTitle)
  ].filter(Boolean);

  return {
    sourceDetails,
    queries: [...new Set(queries.map((query) => normalizeWhitespace(query)).filter(Boolean))]
  };
};

const isAccessoryCandidate = (candidate) => {
  const haystack = normalizeWhitespace(
    `${candidate.title} ${candidate.rawText} ${candidate.url}`.toLowerCase()
  );

  return ACCESSORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

const scoreMatch = (sourceTitle, candidateTitle, sourceDetails) => {
  const sourceTokens = new Set(normalizeTitle(sourceTitle));
  const candidateTokens = new Set(normalizeTitle(candidateTitle));

  if (!sourceTokens.size || !candidateTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) {
      overlap += 1;
    }
  }

  const overlapScore = overlap / Math.max(sourceTokens.size, 1);
  const strictTokenMatches = sourceDetails.strictTokens.filter((token) => candidateTokens.has(token)).length;
  const strictMatchRatio = sourceDetails.strictTokens.length
    ? strictTokenMatches / sourceDetails.strictTokens.length
    : 0;
  const requiredTokenMatches =
    sourceDetails.requiredTokens?.filter((token) => candidateTokens.has(token)).length || 0;

  let score = overlapScore + strictMatchRatio * 0.4;

  if (sourceDetails.brand && candidateTokens.has(sourceDetails.brand.toLowerCase())) {
    score += 0.2;
  } else if (sourceDetails.brand) {
    score -= 0.5;
  }

  if (sourceDetails.familyToken && candidateTokens.has(sourceDetails.familyToken.toLowerCase())) {
    score += 0.15;
  } else if (sourceDetails.familyToken) {
    score -= 0.35;
  }

  if (sourceDetails.variantCode) {
    const candidateHaystack = `${candidateTitle} `.toLowerCase();
    if (candidateHaystack.includes(sourceDetails.variantCode) || candidateHaystack.includes(sourceDetails.variantCode.replace("-", " "))) {
      score += 0.45;
    }
  }

  const candidateLower = candidateTitle.toLowerCase();

  if (!sourceDetails.isMultipack && hasMultipackWords(candidateLower)) {
    score -= 0.5;
  }

  if (!sourceDetails.isMini && hasMiniWord(candidateLower)) {
    score -= 0.35;
  }

  if (
    sourceDetails.storage &&
    normalizeCompactText(candidateTitle).includes(normalizeCompactText(sourceDetails.storage))
  ) {
    score += 0.15;
  } else if (sourceDetails.model && sourceDetails.storage) {
    score -= 0.15;
  }

  if (sourceDetails.color) {
    if (isColorMatch(sourceDetails.color, candidateTitle)) {
      score += 0.35;
    } else if (hasConflictingColor(sourceDetails.color, candidateTitle)) {
      score -= 0.6;
    } else if (sourceDetails.model) {
      score -= 0.15;
    }
  }

  if (sourceDetails.model && candidateTitle.toLowerCase().includes(sourceDetails.model.toLowerCase())) {
    score += 0.2;
  } else if (sourceDetails.isPhoneLike && sourceDetails.model) {
    score -= 0.15;
  }

  if (sourceDetails.model && /pro max/i.test(candidateTitle) && !/pro max/i.test(sourceDetails.model)) {
    score -= 0.35;
  }

  const missingRequiredTokens =
    sourceDetails.requiredTokens?.filter((token) => !candidateTokens.has(token)).length || 0;
  score += requiredTokenMatches * 0.25;
  score -= missingRequiredTokens * 0.45;

  if (sourceDetails.isPhoneLike && sourceDetails.requiredTokens?.length) {
    const sourceVariantTokens = sourceDetails.requiredTokens.filter((token) =>
      PHONE_VARIANT_TOKENS.has(token)
    );

    if (sourceVariantTokens.length) {
      const conflictingVariantTokens = [...PHONE_VARIANT_TOKENS].filter(
        (token) => candidateTokens.has(token) && !sourceVariantTokens.includes(token)
      );
      score -= conflictingVariantTokens.length * 0.4;
    }
  }

  if (
    sourceDetails.primaryNumericToken &&
    !candidateTokens.has(sourceDetails.primaryNumericToken.toLowerCase())
  ) {
    score -= 0.6;
  }

  const missingStrictNumericTokens = sourceDetails.strictTokens.filter(
    (token) => isModelNumberToken(token) && !candidateTokens.has(token)
  ).length;
  score -= missingStrictNumericTokens * 0.25;

  return score;
};

const absoluteFlipkartUrl = (href) => {
  if (!href) {
    return "";
  }

  return href.startsWith("http") ? href : `https://www.flipkart.com${href}`;
};

const getCanonicalFlipkartKey = (url) => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`.toLowerCase();
  } catch (error) {
    return url.toLowerCase();
  }
};

const isUsefulPrice = (price) => typeof price === "number" && price >= 10;

const isBetterCandidateVersion = (nextCandidate, previousCandidate) => {
  if (!previousCandidate) {
    return true;
  }

  if (isUsefulPrice(nextCandidate.price) && !isUsefulPrice(previousCandidate.price)) {
    return true;
  }

  if (
    nextCandidate.title.length > previousCandidate.title.length + 8 &&
    (nextCandidate.rawText?.length || 0) >= (previousCandidate.rawText?.length || 0)
  ) {
    return true;
  }

  if (
    (nextCandidate.rawText?.length || 0) > (previousCandidate.rawText?.length || 0) + 20 &&
    nextCandidate.title.length >= previousCandidate.title.length
  ) {
    return true;
  }

  if (
    nextCandidate.image?.startsWith("http") &&
    previousCandidate.image &&
    !previousCandidate.image.startsWith("http")
  ) {
    return true;
  }

  return false;
};

const pickFirstText = ($root, selectors) => {
  for (const selector of selectors) {
    const value =
      selector === "[title]"
        ? $root.attr("title")?.trim()
        : $root.find(selector).first().text().trim();

    if (value) {
      return value;
    }
  }

  return "";
};

const extractCandidatesFromCheerio = ($) => {
  const candidatesByUrl = new Map();

  $("a[href*='/p/']").each((_, element) => {
    const root = $(element);
    const href = absoluteFlipkartUrl(root.attr("href"));

    if (!href) {
      return;
    }

    const container = root.closest("[data-id]").length ? root.closest("[data-id]") : root.parent();
    const rawText = normalizeWhitespace((container.text() || root.text() || "").trim());
    const title = normalizeWhitespace(
      sanitizeProductTitle(pickFirstText(root, SEARCH_CARD_TITLE_SELECTORS)) || extractTitleFromText(rawText)
    );
    const priceText = normalizeWhitespace(
      pickFirstText(root, SEARCH_CARD_PRICE_SELECTORS) || pickFirstPriceFromText(rawText)
    );
    const image =
      root.find("img").first().attr("src") ||
      root.find("img").first().attr("srcset") ||
      "";

    if (!title) {
      return;
    }

    const candidate = {
      title,
      price: extractNumericPrice(priceText),
      url: canonicalizeFlipkartProductUrl(href),
      image,
      rawText
    };
    const candidateKey = getCanonicalFlipkartKey(href);
    const previousCandidate = candidatesByUrl.get(candidateKey);

    if (isBetterCandidateVersion(candidate, previousCandidate)) {
      candidatesByUrl.set(candidateKey, candidate);
    }
  });

  return [...candidatesByUrl.values()];
};

const extractCandidatesFromPage = async (page) =>
  page.evaluate(
    ({ titleSelectors, priceSelectors }) => {
      const normalizeWhitespaceInPage = (value = "") => value.replace(/\s+/g, " ").trim();

      const extractNumericPriceInPage = (value) => {
        if (!value) {
          return null;
        }

        const numericValue = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
        const parsed = Number.parseFloat(numericValue);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const extractTitleFromTextInPage = (value) => {
        const normalizedValue = normalizeWhitespaceInPage(value)
          .replace(/\b(Currently unavailable|Out of stock|Add to Compare|Bestseller|Trending)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim();

        const iphoneMatch = normalizedValue.match(/Apple iPhone[^₹\u20B9]*?\([^)]*\)/i);
        if (iphoneMatch) {
          return normalizeWhitespaceInPage(iphoneMatch[0]);
        }

        const beforePrice =
          normalizedValue.match(
            /^(.+?)(?=(?:\d(?:\.\d+)?\s*[\d,]*\s*Ratings?|\u20B9|Only few left|Bank Offer|Special Price))/i
          )?.[1] || normalizedValue;

        const cleaned = normalizeWhitespaceInPage(beforePrice).replace(/^[-:|]+|[-:|]+$/g, "").trim();
        return cleaned.length >= 4 && cleaned.length <= 180 ? cleaned : "";
      };

      const pickFirstPriceFromTextInPage = (value) => {
        const normalizedValue = normalizeWhitespaceInPage(value);
        const matches = [
          ...normalizedValue.matchAll(/\u20B9\s?\d{1,3}(?:,\d{2,3})+|\u20B9\s?\d+(?:\.\d+)?/g)
        ];
        const prices = matches
          .map((match) => {
            const numeric = extractNumericPriceInPage(match[0]);
            const index = match.index ?? 0;
            const context = normalizedValue.slice(
              Math.max(0, index - 24),
              Math.min(normalizedValue.length, index + match[0].length + 28)
            );

            return {
              text: match[0],
              numeric,
              index,
              context
            };
          })
          .filter((entry) => entry.numeric);

        const nonOfferPrices = prices.filter(
          (entry) => !/exchange|bank\s*offer|protect\s*promise|buy\s*at|apply\s*offers?/i.test(entry.context)
        );
        const candidatePrices = nonOfferPrices.length ? nonOfferPrices : prices;
        const reasonablePrices = candidatePrices.filter((entry) => entry.numeric >= 50);
        const rankedPrices = (reasonablePrices.length ? reasonablePrices : candidatePrices).sort((first, second) => {
          if (first.numeric !== second.numeric) {
            return first.numeric - second.numeric;
          }

          return first.index - second.index;
        });

        return rankedPrices[0]?.text || "";
      };

      const anchors = Array.from(document.querySelectorAll("a[href*='/p/']"));
      const candidatesByUrl = new Map();

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute("href") || "";
        const absoluteUrl = href.startsWith("http") ? href : `https://www.flipkart.com${href}`;
        const container = anchor.closest("[data-id]") || anchor.parentElement || anchor;
        const rawText = normalizeWhitespaceInPage(
          container?.innerText || anchor.innerText || anchor.textContent || ""
        );

        const title =
          titleSelectors
            .map((selector) =>
              selector === "[title]"
                ? anchor.getAttribute("title")?.trim() || ""
                : anchor.querySelector(selector)?.textContent?.trim() || ""
            )
            .find(Boolean) || extractTitleFromTextInPage(rawText);

        const priceText =
          priceSelectors
            .map((selector) => anchor.querySelector(selector)?.textContent?.trim() || "")
            .find(Boolean) || pickFirstPriceFromTextInPage(rawText);

        if (!absoluteUrl || !title) {
          return;
        }

        const candidate = {
          title: normalizeWhitespaceInPage(title).replace(/^add to compare\s*/i, "").replace(/\bAdd to Compare\b/gi, " ").trim(),
          price: extractNumericPriceInPage(priceText),
          url: absoluteUrl,
          image:
            anchor.querySelector("img")?.getAttribute("src") ||
            anchor.querySelector("img")?.getAttribute("srcset") ||
            "",
          rawText
        };
        const candidateKey = (() => {
          try {
            const parsedUrl = new URL(absoluteUrl);
            return `${parsedUrl.origin}${parsedUrl.pathname}`.toLowerCase();
          } catch (error) {
            return absoluteUrl.toLowerCase();
          }
        })();
        const previousCandidate = candidatesByUrl.get(candidateKey);

        const isUsefulPriceInPage = (price) => typeof price === "number" && price >= 10;
        const shouldReplace =
          !previousCandidate ||
          (isUsefulPriceInPage(candidate.price) && !isUsefulPriceInPage(previousCandidate.price)) ||
          (candidate.title.length > previousCandidate.title.length + 8 &&
            (candidate.rawText?.length || 0) >= (previousCandidate.rawText?.length || 0)) ||
          ((candidate.rawText?.length || 0) > (previousCandidate.rawText?.length || 0) + 20 &&
            candidate.title.length >= previousCandidate.title.length);

        if (shouldReplace) {
          candidatesByUrl.set(candidateKey, candidate);
        }
      });

      return Array.from(candidatesByUrl.values()).filter(Boolean);
    },
    {
      titleSelectors: SEARCH_CARD_TITLE_SELECTORS,
      priceSelectors: SEARCH_CARD_PRICE_SELECTORS
    }
  );

const findBestVariantCandidate = (sourceDetails, candidates, currentUrl) => {
  const currentCanonicalUrl = canonicalizeFlipkartProductUrl(currentUrl);

  const rankedCandidates = candidates
    .filter((candidate) => candidate.url && canonicalizeFlipkartProductUrl(candidate.url) !== currentCanonicalUrl)
    .filter((candidate) => !isAccessoryCandidate(candidate))
    .map((candidate) => {
      const combinedText = `${candidate.title} ${candidate.rawText || ""}`.trim();
      const colorMatched = isColorMatch(sourceDetails.color, combinedText);

      return {
        ...candidate,
        url: canonicalizeFlipkartProductUrl(candidate.url),
        colorMatched,
        score:
          scoreMatch(sourceDetails.matchTitle, candidate.title || combinedText, sourceDetails) +
          (colorMatched ? 0.4 : 0)
      };
    })
    .sort((first, second) => {
      if (Number(second.colorMatched) !== Number(first.colorMatched)) {
        return Number(second.colorMatched) - Number(first.colorMatched);
      }

      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (first.price && second.price) {
        return first.price - second.price;
      }

      return 0;
    });

  return rankedCandidates.find((candidate) => candidate.colorMatched && candidate.score >= 0.85) || null;
};

const scrapeFlipkartProductPage = async (browser, productUrl, expectedTitle, sourceDetails, depth = 0) => {
  const page = await browser.newPage();

  try {
    logScraperDebug("flipkart", "Opening Flipkart product page", {
      productUrl,
      expectedTitle,
      depth
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "accept-language": "en-IN,en;q=0.9"
    });

    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForSelector("body", { timeout: 10000 });

    const closeButton = await page.$("[aria-label='Close']");
    if (closeButton) {
      await closeButton.click().catch(() => {});
    }

    const data = await page.evaluate(
      ({ titleSelectors, priceSelectors, expectedTitleValue }) => {
        const normalizeWhitespaceInPage = (value = "") => value.replace(/\s+/g, " ").trim();
        const bodyText = normalizeWhitespaceInPage(document.body.innerText || "");

        const title =
          titleSelectors
            .map((selector) => document.querySelector(selector)?.textContent?.trim() || "")
            .find(Boolean) || expectedTitleValue;

        let priceText =
          priceSelectors
            .map((selector) => document.querySelector(selector)?.textContent?.trim() || "")
            .find(Boolean) || "";

        if (!priceText) {
          priceText =
            Array.from(document.querySelectorAll("body *"))
              .map((node) => normalizeWhitespaceInPage(node.textContent || ""))
              .filter((text) => /^\u20B9\s?\d{1,3}(?:,\d{2,3})+(?!\d)$|^\u20B9\s?\d+(?:\.\d+)?$/.test(text))
              .sort((first, second) => first.length - second.length)[0] || "";
        }

        const image =
          document.querySelector("img._396cs4")?.getAttribute("src") ||
          document.querySelector("img")?.getAttribute("src") ||
          "";

        return {
          title: title.replace(/^add to compare\s*/i, "").replace(/\bAdd to Compare\b/gi, " ").trim(),
          priceText,
          image,
          bodyText,
          selectedColor: (
            normalizeWhitespaceInPage(bodyText).match(/\bSelected Color:\s*([A-Za-z][A-Za-z ]{1,40})\b/i)?.[1] || ""
          ).replace(/\bVisit brand store\b.*$/i, "").trim(),
          availability: /out of stock|currently unavailable/i.test(bodyText)
            ? "out_of_stock"
            : "available"
        };
      },
      {
        titleSelectors: PRODUCT_PAGE_TITLE_SELECTORS,
        priceSelectors: PRODUCT_PAGE_PRICE_SELECTORS,
        expectedTitleValue: expectedTitle
      }
    );

    const price = extractNumericPrice(data.priceText);
    const normalizedUrl = canonicalizeFlipkartProductUrl(page.url());
    const response = {
      title: data.title,
      price,
      url: normalizedUrl,
      image: data.image,
      availability: data.availability,
      selectedColor: normalizeWhitespace(data.selectedColor)
    };

    logScraperDebug("flipkart", "Flipkart product page parsed", response);

    if (!data.title) {
      return null;
    }

    const currentColorText = [data.title, data.selectedColor].filter(Boolean).join(" ");
    const colorMismatch = Boolean(sourceDetails?.color) && !isColorMatch(sourceDetails.color, currentColorText);

    if (sourceDetails?.color && (colorMismatch || !price) && depth < 2) {
      const html = await page.content();
      const $ = cheerio.load(html);
      const relatedCandidates = extractCandidatesFromCheerio($);
      const bestVariantCandidate = findBestVariantCandidate(sourceDetails, relatedCandidates, page.url());

      logScraperDebug("flipkart", "Flipkart product page variant analysis", {
        requestedColor: sourceDetails.color,
        selectedColor: response.selectedColor,
        colorMismatch,
        relatedCandidateCount: relatedCandidates.length,
        bestVariantCandidate: bestVariantCandidate
          ? {
              title: bestVariantCandidate.title,
              price: bestVariantCandidate.price,
              score: Number(bestVariantCandidate.score.toFixed(3)),
              url: bestVariantCandidate.url
            }
          : null
      });

      if (bestVariantCandidate?.url) {
        const variantResult = await scrapeFlipkartProductPage(
          browser,
          bestVariantCandidate.url,
          bestVariantCandidate.title || expectedTitle,
          sourceDetails,
          depth + 1
        );

        if (variantResult?.price) {
          return variantResult;
        }

        if (bestVariantCandidate.price) {
          return {
            title: sanitizeProductTitle(bestVariantCandidate.title || expectedTitle),
            price: bestVariantCandidate.price,
            url: canonicalizeFlipkartProductUrl(bestVariantCandidate.url),
            image: bestVariantCandidate.image || response.image,
            availability: "available",
            selectedColor: sourceDetails.color
          };
        }
      }
    }

    if (sourceDetails?.color && colorMismatch) {
      logScraperDebug("flipkart", "Rejecting Flipkart product page due to color mismatch", {
        requestedColor: sourceDetails.color,
        selectedColor: response.selectedColor,
        title: response.title,
        url: response.url
      });
      return null;
    }

    return response;
  } catch (error) {
    logScraperError("flipkart", "Flipkart product page scrape failed", error, {
      productUrl,
      expectedTitle
    });
    return null;
  } finally {
    await page.close();
  }
};

export const scrapeFlipkartProduct = async (browser, productTitle) => {
  const { sourceDetails, queries } = buildSearchQueries(productTitle);

  logScraperDebug("flipkart", "Prepared Flipkart search queries", {
    amazonTitle: productTitle,
    sourceDetails,
    queries
  });

  let bestRejectedCandidate = null;

  for (const query of queries) {
    const page = await browser.newPage();

    try {
      logScraperDebug("flipkart", "Searching Flipkart", { query });

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      );
      await page.setExtraHTTPHeaders({
        "accept-language": "en-IN,en;q=0.9"
      });

      const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });

      await page.waitForSelector("body", { timeout: 10000 });

      const closeButton = await page.$("[aria-label='Close']");
      if (closeButton) {
        await closeButton.click().catch(() => {});
      }

      logScraperDebug("flipkart", "Flipkart search page loaded", {
        query,
        pageTitle: await page.title(),
        finalUrl: page.url()
      });

      const html = await page.content();
      const $ = cheerio.load(html);
      let candidates = extractCandidatesFromCheerio($);

      if (!candidates.length) {
        candidates = await extractCandidatesFromPage(page);
      }

      const scoredCandidates = candidates
        .filter((candidate) => !isAccessoryCandidate(candidate))
        .map((candidate) => ({
          ...candidate,
          score: scoreMatch(
            sourceDetails.matchTitle,
            `${candidate.title} ${candidate.rawText || ""}`.trim(),
            sourceDetails
          )
        }))
        .sort((first, second) => {
          if (second.score !== first.score) {
            return second.score - first.score;
          }

          if (first.price && second.price) {
            return first.price - second.price;
          }

          return 0;
        });

      logScraperDebug("flipkart", "Top Flipkart candidates", {
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

      if (!bestCandidate || bestCandidate.score < 0.6) {
        if (bestCandidate && (!bestRejectedCandidate || bestCandidate.score > bestRejectedCandidate.score)) {
          bestRejectedCandidate = bestCandidate;
        }

        logScraperDebug("flipkart", "No confident Flipkart match for query", {
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

      const productDetails = await scrapeFlipkartProductPage(
        browser,
        bestCandidate.url,
        bestCandidate.title,
        sourceDetails
      );

      if (productDetails?.price) {
        const finalResult = {
          ...bestCandidate,
          ...productDetails
        };

        logScraperDebug("flipkart", "Confirmed Flipkart match", finalResult);
        return finalResult;
      }

      if (
        bestCandidate.price &&
        (!sourceDetails.color ||
          isColorMatch(sourceDetails.color, `${bestCandidate.title} ${bestCandidate.rawText || ""}`))
      ) {
        logScraperDebug("flipkart", "Using search-result price as fallback", bestCandidate);
        return bestCandidate;
      }
    } catch (error) {
      logScraperError("flipkart", "Flipkart search query failed", error, { query });
    } finally {
      await page.close();
    }
  }

  logScraperDebug("flipkart", "No Flipkart match confirmed after all queries", {
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
