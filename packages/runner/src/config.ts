import fs from "fs";
import path from "path";

import type { BrowserName } from "@mytest/core";

export interface MyTestConfig {
  baseUrl?: string;
  browser?: BrowserName;
  headless?: boolean;
  defaultTimeoutMs?: number;
  resultsDir?: string;
  artifactsDir?: string;
}

export interface CliOptions {
  tags: string[];
  configPath?: string;
  browserOverride?: BrowserName;
  headlessOverride?: boolean;
}

export const DEFAULT_CONFIG_FILE = "mytest.config.json";

const DEFAULT_CONFIG: MyTestConfig = {
  baseUrl: undefined,
  browser: "chromium",
  headless: true,
  defaultTimeoutMs: 10000,
  resultsDir: "results",
  artifactsDir: "artifacts"
};

export function parseCliArgs(args: string[]): CliOptions {
  const result: CliOptions = {
    tags: []
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--tag" || arg === "-t") {
      const value = args[i + 1];
      if (typeof value === "string" && !value.startsWith("-")) {
        result.tags.push(value);
        i += 1;
      }
    } else if (arg === "--config" || arg === "-c") {
      const value = args[i + 1];
      if (typeof value === "string" && !value.startsWith("-")) {
        result.configPath = value;
        i += 1;
      }
    } else if (arg === "--browser") {
      const value = args[i + 1];
      if (value === "chromium" || value === "firefox" || value === "webkit") {
        result.browserOverride = value;
        i += 1;
      }
    } else if (arg === "--headless") {
      const value = args[i + 1];
      if (value === "true" || value === "false") {
        result.headlessOverride = value === "true";
        i += 1;
      }
    }
  }

  return result;
}

export function loadConfig(cwd: string, configPathFromCli?: string): MyTestConfig {
  const configPath = path.resolve(cwd, configPathFromCli ?? DEFAULT_CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Invalid JSON, fall back to defaults.
    return { ...DEFAULT_CONFIG };
  }

  const config: MyTestConfig = { ...DEFAULT_CONFIG };

  if (parsed && typeof parsed === "object") {
    const anyParsed = parsed as {
      baseUrl?: unknown;
      browser?: unknown;
      headless?: unknown;
      defaultTimeoutMs?: unknown;
      resultsDir?: unknown;
      artifactsDir?: unknown;
    };

    if (typeof anyParsed.baseUrl === "string") {
      config.baseUrl = anyParsed.baseUrl;
    }

    if (
      anyParsed.browser === "chromium" ||
      anyParsed.browser === "firefox" ||
      anyParsed.browser === "webkit"
    ) {
      config.browser = anyParsed.browser;
    }

    if (typeof anyParsed.headless === "boolean") {
      config.headless = anyParsed.headless;
    }

    if (typeof anyParsed.defaultTimeoutMs === "number") {
      config.defaultTimeoutMs = anyParsed.defaultTimeoutMs;
    }

    if (typeof anyParsed.resultsDir === "string") {
      config.resultsDir = anyParsed.resultsDir;
    }

    if (typeof anyParsed.artifactsDir === "string") {
      config.artifactsDir = anyParsed.artifactsDir;
    }
  }

  return config;
}

