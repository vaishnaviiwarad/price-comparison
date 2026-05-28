import puppeteer from "puppeteer";
import { logScraperDebug, logScraperError } from "./debug.js";

const BROWSER_LAUNCH_OPTIONS = {
  headless: process.env.HEADLESS !== "false",
  defaultViewport: {
    width: 1366,
    height: 900
  },
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
};

let browserInstance = null;
let browserLaunchPromise = null;
let shutdownHooksRegistered = false;

const resetBrowserState = () => {
  browserInstance = null;
  browserLaunchPromise = null;
};

const closeTrackedBrowser = async (reason) => {
  if (!browserInstance) {
    resetBrowserState();
    return;
  }

  const browserToClose = browserInstance;
  resetBrowserState();

  try {
    await browserToClose.close();
    logScraperDebug("browser", "Shared browser closed", { reason });
  } catch (error) {
    logScraperError("browser", "Failed to close shared browser", error, { reason });
  }
};

const registerShutdownHooks = () => {
  if (shutdownHooksRegistered) {
    return;
  }

  const handleShutdownSignal = (signal) => {
    closeTrackedBrowser(signal).finally(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", () => handleShutdownSignal("SIGINT"));
  process.once("SIGTERM", () => handleShutdownSignal("SIGTERM"));
  shutdownHooksRegistered = true;
};

const launchBrowser = async () => {
  registerShutdownHooks();
  logScraperDebug("browser", "Launching shared browser");

  const browser = await puppeteer.launch(BROWSER_LAUNCH_OPTIONS);
  browser.on("disconnected", () => {
    logScraperDebug("browser", "Shared browser disconnected");
    resetBrowserState();
  });

  browserInstance = browser;
  return browser;
};

export const getSharedBrowser = async () => {
  if (browserInstance?.connected) {
    return browserInstance;
  }

  if (!browserLaunchPromise) {
    browserLaunchPromise = launchBrowser().catch((error) => {
      resetBrowserState();
      throw error;
    });
  }

  return browserLaunchPromise;
};
