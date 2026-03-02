#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { runTest, type TestFn, type TestResult } from "@mytest/core";
import { writeResults } from "@mytest/reporter";
import { loadConfig, parseCliArgs, type MyTestConfig } from "./config";

interface DiscoveredTest {
  name: string;
  fn: TestFn;
  description?: string;
  tags?: string[];
}

async function discoverTestFiles(testsDir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(testsDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(path.join(testsDir, entry.name));
    }
  }

  return files;
}

async function loadTestsFromFile(filePath: string): Promise<DiscoveredTest[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(filePath) as { tests?: unknown };
  const rawTests = Array.isArray(mod.tests) ? mod.tests : [];
  const result: DiscoveredTest[] = [];

  for (const t of rawTests) {
    if (!t || typeof t !== "object") {
      continue;
    }

    const anyTest = t as {
      name?: unknown;
      fn?: unknown;
      description?: unknown;
      tags?: unknown;
    };
    const name = anyTest.name;
    const fn = anyTest.fn;

    if (typeof name === "string" && typeof fn === "function") {
      const description = typeof anyTest.description === "string" ? anyTest.description : undefined;
      const tagsArray =
        Array.isArray(anyTest.tags) && anyTest.tags.every((tag) => typeof tag === "string")
          ? (anyTest.tags as string[])
          : undefined;

      result.push({
        name,
        fn: fn as TestFn,
        description,
        tags: tagsArray
      });
    }
  }

  return result;
}

function shouldRunTest(test: DiscoveredTest, cliTags: string[]): boolean {
  if (cliTags.length === 0) {
    return true;
  }

  const testTags = test.tags ?? [];
  if (testTags.length === 0) {
    return false;
  }

  return testTags.some((tag) => cliTags.includes(tag));
}

async function main(): Promise<void> {
  const [, , command, ...restArgs] = process.argv;

  if (command !== "run") {
    console.log("Usage: mytest run [--config mytest.config.json] [--browser chromium|firefox|webkit] [--headless true|false] [--tag smoke]");
    process.exit(1);
  }

  const cwd = process.cwd();
  const cliOptions = parseCliArgs(restArgs);
  const config: MyTestConfig = loadConfig(cwd, cliOptions.configPath);
  const testsDir = path.resolve(cwd, "tests");

  if (!fs.existsSync(testsDir)) {
    console.error(`Tests directory not found: ${testsDir}`);
    process.exit(1);
  }

  const testFilePaths = await discoverTestFiles(testsDir);

  if (testFilePaths.length === 0) {
    console.warn(`No test files found in ${testsDir}. Expected files matching *.test.js`);
  }

  const allResults: TestResult[] = [];

  for (const filePath of testFilePaths) {
    const relativeFile = path.relative(cwd, filePath);
    const tests = await loadTestsFromFile(filePath);

    if (tests.length === 0) {
      console.warn(
        `No tests exported from ${relativeFile}. Expected: module.exports = { tests: [...] }`
      );
      continue;
    }

    for (const test of tests) {
      if (!shouldRunTest(test, cliOptions.tags)) {
        // Skip tests that do not match requested tags.
        continue;
      }

      console.log(`Running ${test.name} (${relativeFile}) ...`);
      const result = await runTest(test.name, test.fn, {
        browser: cliOptions.browserOverride ?? config.browser,
        headless: cliOptions.headlessOverride ?? config.headless,
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

  await writeResults(allResults, {
    outputDir: config.resultsDir
  });

  const passedCount = allResults.filter((r) => r.status === "passed").length;
  const failedCount = allResults.filter((r) => r.status === "failed").length;

  console.log("");
  console.log(`Summary: ${passedCount} passed, ${failedCount} failed, ${allResults.length} total.`);
}

main().catch((err: unknown) => {
  console.error("Error running tests:", err);
  process.exit(1);
});

