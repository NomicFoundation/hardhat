import { assert } from "chai";
import * as path from "path";

import { Anonymizer } from "../../../src/internal/sentry/anonymizer";

const PROJECT_ROOT = "/path/to/project";

class MockedAnonymizer extends Anonymizer {
  public getFilePackageJsonPathResult: string | undefined = undefined;

  protected _getFilePackageJsonPath(_: string): string | undefined {
    return this.getFilePackageJsonPathResult;
  }
}

describe("Anonymizer", () => {
  it("should anonymize paths of the user's project", () => {
    const anonymizer = new Anonymizer();
    const anonymizationResult = anonymizer.anonymizeFilename(
      path.join(PROJECT_ROOT, "src", "someFile.js")
    );

    assert.equal(anonymizationResult.anonymizedFilename, "<user-file>");
    assert.isTrue(anonymizationResult.anonymizeContent);
  });

  it("should anonymize paths of the user's project in the project's root", () => {
    const anonymizer = new Anonymizer();
    const anonymizationResult = anonymizer.anonymizeFilename(
      path.join(PROJECT_ROOT, "someFile.js")
    );

    assert.equal(anonymizationResult.anonymizedFilename, "<user-file>");
    assert.isTrue(anonymizationResult.anonymizeContent);
  });

  it("should not anonymize paths of hardhat files", () => {
    const anonymizer = new Anonymizer();
    const hardhatFilePath = path.join(
      "node_modules",
      "@nomiclabs",
      "hardhat",
      "someHardhatFile.js"
    );
    const anonymizationResult = anonymizer.anonymizeFilename(
      path.join(PROJECT_ROOT, hardhatFilePath)
    );

    assert.equal(
      anonymizationResult.anonymizedFilename,
      path.join(hardhatFilePath)
    );
    assert.isFalse(anonymizationResult.anonymizeContent);
  });

  it("should not anonymize internal node paths", () => {
    const anonymizer = new Anonymizer();
    const internalNodePath = path.join("internal", "some", "module", "main.js");
    const anonymizationResult = anonymizer.anonymizeFilename(internalNodePath);

    assert.equal(anonymizationResult.anonymizedFilename, internalNodePath);
    assert.isFalse(anonymizationResult.anonymizeContent);
  });

  describe("hardhat config", () => {
    it("should return only the config's relative path", () => {
      const pathToHardhatConfig = path.join(PROJECT_ROOT, "hardhat.config.ts");
      const anonymizer = new MockedAnonymizer(pathToHardhatConfig);
      anonymizer.getFilePackageJsonPathResult = path.join(
        PROJECT_ROOT,
        "package.json"
      );

      const anonymizationResult =
        anonymizer.anonymizeFilename(pathToHardhatConfig);

      assert.equal(anonymizationResult.anonymizedFilename, "hardhat.config.ts");
      assert.isTrue(anonymizationResult.anonymizeContent);
    });

    it("should return only the config's relative path when it's not in the root", () => {
      const pathToHardhatConfig = path.join(
        PROJECT_ROOT,
        "config",
        "hardhat.config.ts"
      );
      const anonymizer = new MockedAnonymizer(pathToHardhatConfig);
      anonymizer.getFilePackageJsonPathResult = path.join(
        PROJECT_ROOT,
        "package.json"
      );

      const anonymizationResult =
        anonymizer.anonymizeFilename(pathToHardhatConfig);

      assert.equal(
        anonymizationResult.anonymizedFilename,
        path.join("config", "hardhat.config.ts")
      );
      assert.isTrue(anonymizationResult.anonymizeContent);
    });

    it("should return only the config's base name if package.json cannot be found", () => {
      const pathToHardhatConfig = path.join(
        PROJECT_ROOT,
        "config",
        "hardhat.config.ts"
      );
      const anonymizer = new MockedAnonymizer(pathToHardhatConfig);

      const anonymizationResult =
        anonymizer.anonymizeFilename(pathToHardhatConfig);

      assert.equal(anonymizationResult.anonymizedFilename, "hardhat.config.ts");
      assert.isTrue(anonymizationResult.anonymizeContent);
    });
  });

  describe("error message", () => {
    it("should return the same message if there are no paths", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = "Something happened";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(anonymizedErrorMessage, errorMessage);
    });

    it("should anonymize a single path", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = `Something happened at file ${__filename}`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "Something happened at file <user-file>"
      );
    });

    it("should anonymize a path between parentheses", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = `Something happened (${__filename})`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(anonymizedErrorMessage, "Something happened <user-file>");
    });

    it("should anonymize multiple paths", () => {
      const anonymizer = new Anonymizer();
      const file1 = __filename;
      const file2 = path.resolve(__filename, "..", "some-other-file.js");
      const errorMessage = `Something happened at file ${file1} and at file ${file2}`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "Something happened at file <user-file> and at file <user-file>"
      );
    });

    it("should anonymize multiline errors", () => {
      const anonymizer = new Anonymizer();
      const file1 = __filename;
      const file2 = path.resolve(__filename, "..", "some-other-file.js");
      const errorMessage = `Something happened at file ${file1} and\nsomething else happened at file ${file2}`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        `Something happened at file <user-file> and\nsomething else happened at file <user-file>`
      );
    });

    it("should anonymize files that end with ellipsis", () => {
      const anonymizer = new Anonymizer();
      const file = `${__filename.slice(0, __filename.length - 5)}...`;
      const errorMessage = `Something happened at file ${file}: something`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "Something happened at file <user-file> something"
      );
    });

    it("should anonymize a file that doesn't have a path separator", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = "Something happened at file foo.json";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "Something happened at file <user-file>"
      );
    });

    it("should anonymize multiple files that don't have a path separator", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "Something happened at file foo.json and at file bar.ts";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "Something happened at file <user-file> and at file <user-file>"
      );
    });

    it("shouldn't anonymize stand-alone extensions", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = "The .json extension is not supported";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(anonymizedErrorMessage, errorMessage);
    });

    it("shouldn't interpret periods as files with extensions", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = "This is a sentence. This is another sentence.";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(anonymizedErrorMessage, errorMessage);
    });

    it("should hide a private key that starts with 0x", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My PK is 0x3ecf4eda095143894fef9fc0c2480d44c4c7e40bf340448e3039da92888b3096";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My PK is xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      );
    });

    it("should hide a private key that doesn't start with 0x", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My PK is 3ecf4eda095143894fef9fc0c2480d44c4c7e40bf340448e3039da92888b3096";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My PK is xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      );
    });

    it("should hide multiple private keys", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My PKs are 0x3ecf4eda095143894fef9fc0c2480d44c4c7e40bf340448e3039da92888b3096\nand 0x7b63fe0cc949ac8fd4161a943b7ab26156c06315c2a9030e064980e7bcc7a056";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My PKs are xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nand xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      );
    });

    it("should hide addresses", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My addresses are 0xf658b4176b77f6d6439D249D04f166eF315d69FC and 30444113Ad783A6bd92E057a21572a70890e7768";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My addresses are xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx and xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      );
    });

    it("should hide mnemonic phrases", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My mnemonic phrase is test test test test test test test test test test test test. This is an error message.";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My mnemonic phrase is <mnemonic>. This is an error message."
      );
    });

    it("should hide mnemonic phrases that start with spaces", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "   My mnemonic phrase is test test test test test test test test test test test test. This is an error message.";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "   My mnemonic phrase is <mnemonic>. This is an error message."
      );
    });

    it("should hide mnemonic phrases that start with punctuation", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "[module] My mnemonic phrase is test test test test test test test test test test test test. This is an error message.";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "[module] My mnemonic phrase is <mnemonic>. This is an error message."
      );
    });

    it("should hide mnemonic phrases with typos", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My mnemonic phrase is test test test test test tset test test test test test test. This is an error message.";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My mnemonic phrase is <mnemonic> tset <mnemonic>. This is an error message."
      );
    });

    it("should hide mnemonic phrases with ideograms", () => {
      const anonymizer = new Anonymizer();
      const errorMessage =
        "My mnemonic phrase is 就 就 就 就 就 就 就 就 就 就 就 就. This is an error message.";
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        "My mnemonic phrase is <mnemonic>. This is an error message."
      );
    });

    it("should hide all mnemonic phrase fragments", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = `My mnemonic phrase is test test test test test test test test test test test test. This is an error message.
And here is some more more more more`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        `My mnemonic phrase is <mnemonic>. This is an error message.
And here is some <mnemonic>`
      );
    });

    it("should hide all mnemonic phrase fragments, even when one fragment is a subset of another one", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = `My mnemonic phrase is test test test test test test test test test test test test. This is an error message.
And here is some test test test test. And then there is more more more more.
And a bit more more more more more more more more more more more more.`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        `My mnemonic phrase is <mnemonic>. This is an error message.
And here is some <mnemonic>. And then there is <mnemonic>.
And a bit <mnemonic>.`
      );
    });

    it("should hide mnemonic phrase fragments, even when there's several kinds of whitespace", () => {
      const anonymizer = new Anonymizer();
      const errorMessage = `My mnemonic phrase is test test test         test
test\ttest \r
test test test test test test. This is an error message.`;
      const anonymizedErrorMessage =
        anonymizer.anonymizeErrorMessage(errorMessage);

      assert.equal(
        anonymizedErrorMessage,
        `My mnemonic phrase is <mnemonic>. This is an error message.`
      );
    });
  });
});
