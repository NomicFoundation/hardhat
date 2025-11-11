import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { expect } from "chai";
import { fileURLToPath } from "url";
import { describe, it } from "node:test";
import { after, afterEach, beforeEach } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("TypeChain compile scenarios", function () {
  const fixturesDir = path.join(__dirname, "fixture-projects", "generate-types");
  const typechainDir = path.join(fixturesDir, "types");

  beforeEach(() => {
    if (fs.existsSync(typechainDir)) {
      fs.rmSync(typechainDir, { recursive: true, force: true });
    }
  });

  it("should compile all contracts and generate TypeChain files", function () {
    try {
      execSync("npx hardhat compile", {
        cwd: fixturesDir,
        stdio: "inherit",
        shell: true as any, // needed on Windows
      });
    } catch (err: any) {
      console.error("Hardhat compile failed:", err);
      throw err;
    }

    // Assert TypeChain files exist
    expect(fs.existsSync(typechainDir), "typechain-types folder missing").to.equal(true);
    const generatedFiles = fs.readdirSync(typechainDir);
    expect(generatedFiles.length, "No TypeChain files generated").to.be.greaterThan(0);
  });
});

