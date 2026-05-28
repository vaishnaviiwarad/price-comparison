import { existsSync } from "node:fs";
import path from "node:path";
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

const getWindowsBrowserPaths = () => {
  const programFiles = process.env.PROGRAMFILES;
  const programFilesX86 = process.env["PROGRAMFILES(X86)"];
  const localAppData = process.env.LOCALAPPDATA;

  return [
    programFiles && path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    programFilesX86 && path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    localAppData && path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    programFiles && path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    programFilesX86 && path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe")
  ];
};

const getBrowserExecutablePath = () => {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_EXECUTABLE_PATH;

  if (configuredPath) {
    return configuredPath;
  }

  const systemBrowserPath = getWindowsBrowserPaths().find((browserPath) => (
    browserPath && existsSync(browserPath)
  ));

  return systemBrowserPath || null;
};

const getBrowserLaunchOptions = () => {
  const executablePath = getBrowserExecutablePath();

  if (!executablePath) {
    return BROWSER_LAUNCH_OPTIONS;
  }

  return {
    ...BROWSER_LAUNCH_OPTIONS,
    executablePath
  };
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
  const launchOptions = getBrowserLaunchOptions();

  logScraperDebug("browser", "Launching shared browser", {
    executablePath: launchOptions.executablePath || "puppeteer-managed"
  });

  const browser = await puppeteer.launch(launchOptions);
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
