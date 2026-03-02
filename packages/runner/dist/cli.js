#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@mytest/core");
const reporter_1 = require("@mytest/reporter");
const config_1 = require("./config");
async function discoverTestFiles(testsDir) {
    const entries = await fs_1.default.promises.readdir(testsDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".test.js")) {
            files.push(path_1.default.join(testsDir, entry.name));
        }
    }
    return files;
}
async function loadTestsFromFile(filePath) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(filePath);
    const rawTests = Array.isArray(mod.tests) ? mod.tests : [];
    const result = [];
    for (const t of rawTests) {
        if (!t || typeof t !== "object") {
            continue;
        }
        const anyTest = t;
        const name = anyTest.name;
        const fn = anyTest.fn;
        if (typeof name === "string" && typeof fn === "function") {
            const description = typeof anyTest.description === "string" ? anyTest.description : undefined;
            const tagsArray = Array.isArray(anyTest.tags) && anyTest.tags.every((tag) => typeof tag === "string")
                ? anyTest.tags
                : undefined;
            result.push({
                name,
                fn: fn,
                description,
                tags: tagsArray
            });
        }
    }
    return result;
}
function shouldRunTest(test, cliTags) {
    var _a;
    if (cliTags.length === 0) {
        return true;
    }
    const testTags = (_a = test.tags) !== null && _a !== void 0 ? _a : [];
    if (testTags.length === 0) {
        return false;
    }
    return testTags.some((tag) => cliTags.includes(tag));
}
async function main() {
    var _a, _b;
    const [, , command, ...restArgs] = process.argv;
    if (command !== "run") {
        console.log("Usage: mytest run [--config mytest.config.json] [--browser chromium|firefox|webkit] [--headless true|false] [--tag smoke]");
        process.exit(1);
    }
    const cwd = process.cwd();
    const cliOptions = (0, config_1.parseCliArgs)(restArgs);
    const config = (0, config_1.loadConfig)(cwd, cliOptions.configPath);
    const testsDir = path_1.default.resolve(cwd, "tests");
    if (!fs_1.default.existsSync(testsDir)) {
        console.error(`Tests directory not found: ${testsDir}`);
        process.exit(1);
    }
    const testFilePaths = await discoverTestFiles(testsDir);
    if (testFilePaths.length === 0) {
        console.warn(`No test files found in ${testsDir}. Expected files matching *.test.js`);
    }
    const allResults = [];
    for (const filePath of testFilePaths) {
        const relativeFile = path_1.default.relative(cwd, filePath);
        const tests = await loadTestsFromFile(filePath);
        if (tests.length === 0) {
            console.warn(`No tests exported from ${relativeFile}. Expected: module.exports = { tests: [...] }`);
            continue;
        }
        for (const test of tests) {
            if (!shouldRunTest(test, cliOptions.tags)) {
                // Skip tests that do not match requested tags.
                continue;
            }
            console.log(`Running ${test.name} (${relativeFile}) ...`);
            const result = await (0, core_1.runTest)(test.name, test.fn, {
                browser: (_a = cliOptions.browserOverride) !== null && _a !== void 0 ? _a : config.browser,
                headless: (_b = cliOptions.headlessOverride) !== null && _b !== void 0 ? _b : config.headless,
                baseUrl: config.baseUrl,
                artifactsDir: config.artifactsDir
            });
            allResults.push(result);
            const statusLabel = result.status === "passed" ? "PASSED" : "FAILED";
            console.log(` -> ${statusLabel} in ${result.durationMs}ms`);
            if (result.errors.length > 0) {
                for (const error of result.errors) {
                    console.error(`    ${error}`);
                }
            }
        }
    }
    await (0, reporter_1.writeResults)(allResults, {
        outputDir: config.resultsDir
    });
    const passedCount = allResults.filter((r) => r.status === "passed").length;
    const failedCount = allResults.filter((r) => r.status === "failed").length;
    console.log("");
    console.log(`Summary: ${passedCount} passed, ${failedCount} failed, ${allResults.length} total.`);
}
main().catch((err) => {
    console.error("Error running tests:", err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map