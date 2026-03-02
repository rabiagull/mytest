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
export declare const DEFAULT_CONFIG_FILE = "mytest.config.json";
export declare function parseCliArgs(args: string[]): CliOptions;
export declare function loadConfig(cwd: string, configPathFromCli?: string): MyTestConfig;
