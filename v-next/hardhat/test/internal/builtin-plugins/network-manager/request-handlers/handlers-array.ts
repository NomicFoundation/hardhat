import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";

import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import debug from "debug";

const log = debug(
  "hardhat:test:network-manager:request-handlers:request-array",
);

/**
 * Example debug output:
 * 2025-03-18T10:54:37.575Z hardhat:test:network-manager:request-handlers:request-array importing hd-wallet-handler.ts took 37ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing local-accounts.ts took 36ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing fixed-sender-handler.ts took 11ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing chain-id-handler.ts took 11ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing chain-id.ts took 11ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing automatic-gas-handler.ts took 11ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing automatic-gas-price-handler.ts took 11ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing fixed-gas-handler.ts took 11ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing automatic-sender-handler.ts took 10ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing sender.ts took 10ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing fixed-gas-price-handler.ts took 10ms
 * 2025-03-18T10:54:37.576Z hardhat:test:network-manager:request-handlers:request-array importing multiplied-gas-estimation.ts took 10ms
 */

describe(
  "HandlersArray",
  {
    skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
  },
  async () => {
    it(`should load all the handlers in a reasonable amount of time`, async () => {
      const handlersDir = path.resolve(
        "src/internal/builtin-plugins/network-manager/request-handlers/handlers",
      );
      const handlers = await getAllFilesMatching(handlersDir);
      const handlerImports = [];

      const nodeOptions: any = {
        cwd: process.cwd(),
        stdio: "pipe",
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          NO_COLOR: "1",
        },
      };

      // NOTE: First, we run a dummy command to warm up node. The number of runs
      // is arbitrary, but it seems to be enough to get reasonable stability.
      for (let i = 0; i < 20; i++) {
        execSync("node --import tsx/esm -e ''", nodeOptions);
      }

      for (const handler of handlers) {
        const output = execSync(
          `node --import tsx/esm -e "const start = Date.now(); await import('${handler}'); console.log(Date.now() - start);"`,
          {
            cwd: process.cwd(),
            stdio: "pipe",
            env: {
              ...process.env,
              FORCE_COLOR: "0",
              NO_COLOR: "1",
            },
          },
        );
        const duration = parseInt(output.toString().trim(), 10);
        handlerImports.push({
          handler: path.basename(handler),
          duration,
        });
      }

      handlerImports.sort((a, b) => b.duration - a.duration);

      for (const { handler, duration } of handlerImports) {
        log(`importing ${handler} took ${duration}ms`);
      }

      // NOTE: The maximum import duration is arbitrary, but it seems to reasonably detect the outliers.
      const maxImportDuration = 20;
      const longestHandlerImport = handlerImports[0];

      assert.ok(
        longestHandlerImport.duration < maxImportDuration,
        `The maximum import duration of ${longestHandlerImport.duration}ms (${longestHandlerImport.handler}) exceeds the ${maxImportDuration}ms limit`,
      );
    });
  },
);
