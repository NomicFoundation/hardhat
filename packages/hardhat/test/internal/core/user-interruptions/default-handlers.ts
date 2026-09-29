import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const userInterruptionsModule = pathToFileURL(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../src/internal/core/user-interruptions.ts",
  ),
).href;

// Runs the default handlers in a child process whose stdin is a pipe, and
// returns the answers the prompts received.
async function answersFromPipedStdin(
  chunks: string[],
  prompts: Array<"input" | "secret">,
  terminalOutput = false,
): Promise<string[]> {
  const script = `
    import { UserInterruptionManagerImplementation } from ${JSON.stringify(userInterruptionsModule)};
    process.stdout.isTTY = ${terminalOutput};
    const hooks = {
      runHandlerChain: (_category, _name, args, defaultHandler) =>
        defaultHandler({}, ...args),
    };
    const manager = new UserInterruptionManagerImplementation(hooks);
    const answers = [];
    for (const prompt of ${JSON.stringify(prompts)}) {
      answers.push(
        prompt === "secret"
          ? await manager.requestSecretInput("test", "Secret")
          : await manager.requestInput("test", "Input"),
      );
    }
    process.stderr.write("ANSWERS=" + JSON.stringify(answers) + "\\n");
  `;

  const child = spawn(
    process.execPath,
    ["--import", "tsx/esm", "--input-type=module", "--eval", script],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  let stderr = "";
  let stdout = "";
  let nextChunk = 1;
  const closed = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  child.stderr.on("data", (data) => (stderr += data));
  child.stdout.on("data", (data) => {
    stdout += data;
    // The second write happens only after the next prompt is waiting for input.
    if (nextChunk < chunks.length && stdout.includes("Secret: ")) {
      child.stdin.end(chunks[nextChunk]);
      nextChunk++;
    }
  });

  const timeout = setTimeout(() => child.kill(), 10_000);
  let code: number | null;
  try {
    if (chunks.length === 1) {
      child.stdin.end(chunks[0]);
    } else {
      assert.equal(chunks.length, 2);
      child.stdin.write(chunks[0]);
    }
    code = await closed;
  } finally {
    clearTimeout(timeout);
    child.kill();
  }
  assert.equal(code, 0, stderr);
  const answers = /^ANSWERS=(.*)$/m.exec(stderr);
  assert.ok(answers !== null, stderr);
  return JSON.parse(answers[1]);
}

for (const terminalOutput of [false, true]) {
  describe(`default user interruption handlers (stdout isTTY=${terminalOutput})`, () => {
    it("should answer consecutive prompts from input piped in a single chunk", async () => {
      assert.deepEqual(
        await answersFromPipedStdin(
          ["first\nsecret\nsecond\n"],
          ["input", "secret", "input"],
          terminalOutput,
        ),
        ["first", "secret", "second"],
      );
    });

    it("should answer consecutive prompts from input piped in several chunks", async () => {
      assert.deepEqual(
        await answersFromPipedStdin(
          ["first\n", "secret\nsecond\n"],
          ["input", "secret", "input"],
          terminalOutput,
        ),
        ["first", "secret", "second"],
      );
    });

    it("should preserve piped answers when the first prompt is secret", async () => {
      assert.deepEqual(
        await answersFromPipedStdin(
          ["secret\nfirst\nsecond\n"],
          ["secret", "input", "input"],
          terminalOutput,
        ),
        ["secret", "first", "second"],
      );
    });
  });
}
