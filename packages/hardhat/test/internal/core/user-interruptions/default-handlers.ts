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
): Promise<string[]> {
  const script = `
    import { UserInterruptionManagerImplementation } from ${JSON.stringify(userInterruptionsModule)};
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
    { stdio: ["pipe", "ignore", "pipe"] },
  );

  let stderr = "";
  child.stderr.on("data", (data) => (stderr += data));

  for (const chunk of chunks) {
    child.stdin.write(chunk);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.stdin.end();

  const code = await new Promise((resolve) => child.on("close", resolve));
  assert.equal(code, 0, stderr);
  const answers = /^ANSWERS=(.*)$/m.exec(stderr);
  assert.ok(answers !== null, stderr);
  return JSON.parse(answers[1]);
}

describe("default user interruption handlers", () => {
  it("should answer consecutive prompts from input piped in a single chunk", async () => {
    assert.deepEqual(
      await answersFromPipedStdin(
        ["first\nsecret\nsecond\n"],
        ["input", "secret", "input"],
      ),
      ["first", "secret", "second"],
    );
  });

  it("should answer consecutive prompts from input piped in several chunks", async () => {
    assert.deepEqual(
      await answersFromPipedStdin(
        ["first\n", "secret\nsecond\n"],
        ["input", "secret", "input"],
      ),
      ["first", "secret", "second"],
    );
  });
});
