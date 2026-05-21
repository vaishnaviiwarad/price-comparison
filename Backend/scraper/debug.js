const isObject = (value) => value && typeof value === "object";

const normalizeError = (error) => {
  if (!error) {
    return { message: "Unknown error" };
  }

  return {
    message: error.message || String(error),
    stack: error.stack || ""
  };
};

const serializeDetails = (details) => {
  if (!isObject(details)) {
    return details;
  }

  try {
    return JSON.parse(JSON.stringify(details));
  } catch (error) {
    return details;
  }
};

export const isScraperDebugEnabled = () => process.env.SCRAPER_DEBUG === "true";

export const logScraperDebug = (scope, message, details = undefined) => {
  if (!isScraperDebugEnabled()) {
    return;
  }

  if (details === undefined) {
    console.log(`[${scope}] ${message}`);
    return;
  }

  console.log(`[${scope}] ${message}`, serializeDetails(details));
};

export const logScraperError = (scope, message, error, details = undefined) => {
  const normalizedError = normalizeError(error);

  if (details === undefined) {
    console.error(`[${scope}] ${message}`, normalizedError);
    return;
  }

  console.error(`[${scope}] ${message}`, {
    ...serializeDetails(details),
    error: normalizedError
  });
};
