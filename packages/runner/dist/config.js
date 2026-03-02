"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG_FILE = void 0;
exports.parseCliArgs = parseCliArgs;
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.DEFAULT_CONFIG_FILE = "mytest.config.json";
const DEFAULT_CONFIG = {
    baseUrl: undefined,
    browser: "chromium",
    headless: true,
    defaultTimeoutMs: 10000,
    resultsDir: "results",
    artifactsDir: "artifacts"
};
function parseCliArgs(args) {
    const result = {
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
        }
        else if (arg === "--config" || arg === "-c") {
            const value = args[i + 1];
            if (typeof value === "string" && !value.startsWith("-")) {
                result.configPath = value;
                i += 1;
            }
        }
        else if (arg === "--browser") {
            const value = args[i + 1];
            if (value === "chromium" || value === "firefox" || value === "webkit") {
                result.browserOverride = value;
                i += 1;
            }
        }
        else if (arg === "--headless") {
            const value = args[i + 1];
            if (value === "true" || value === "false") {
                result.headlessOverride = value === "true";
                i += 1;
            }
        }
    }
    return result;
}
function loadConfig(cwd, configPathFromCli) {
    const configPath = path_1.default.resolve(cwd, configPathFromCli !== null && configPathFromCli !== void 0 ? configPathFromCli : exports.DEFAULT_CONFIG_FILE);
    if (!fs_1.default.existsSync(configPath)) {
        return { ...DEFAULT_CONFIG };
    }
    const raw = fs_1.default.readFileSync(configPath, "utf-8");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        // Invalid JSON, fall back to defaults.
        return { ...DEFAULT_CONFIG };
    }
    const config = { ...DEFAULT_CONFIG };
    if (parsed && typeof parsed === "object") {
        const anyParsed = parsed;
        if (typeof anyParsed.baseUrl === "string") {
            config.baseUrl = anyParsed.baseUrl;
        }
        if (anyParsed.browser === "chromium" ||
            anyParsed.browser === "firefox" ||
            anyParsed.browser === "webkit") {
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
//# sourceMappingURL=config.js.map