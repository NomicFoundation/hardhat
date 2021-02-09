import { assert } from "chai";
import * as fsExtra from "fs-extra";
import path from "path";
import slash from "slash";

import { TASK_COMPILE } from "../../../src/builtin-tasks/task-names";
import { ERRORS } from "../../../src/internal/core/errors-list";
import { Parser } from "../../../src/internal/solidity/parse";
import {
  ResolvedFile,
  Resolver,
} from "../../../src/internal/solidity/resolver";
import { LibraryInfo } from "../../../src/types/builtin-tasks";
import { useEnvironment } from "../../helpers/environment";
import { expectHardhatErrorAsync } from "../../helpers/errors";
import {
  getFixtureProjectPath,
  useFixtureProject,
} from "../../helpers/project";

function assertResolvedFilePartiallyEquals(
  actual: ResolvedFile,
  expected: Partial<ResolvedFile>
) {
  for (const key of Object.keys(expected)) {
    const typedKey = key as keyof ResolvedFile;
    assert.deepEqual(actual[typedKey], expected[typedKey]);
  }
}

const buildContent = (rawContent: string) => ({
  rawContent,
  imports: [],
  versionPragmas: [],
});

describe("Resolved file", function () {
  const sourceName = "sourceName.sol";
  const absolutePath = "/path/to/file/sourceName.sol";
  const content = buildContent("the file content");
  const lastModificationDate = new Date();
  const libraryName = "lib";
  const libraryVersion = "0.1.0";

  let resolvedFileWithoutLibrary: ResolvedFile;
  let resolvedFileWithLibrary: ResolvedFile;

  before("init files", function () {
    resolvedFileWithoutLibrary = new ResolvedFile(
      sourceName,
      absolutePath,
      content,
      "<content-hash-file-without-library>",
      lastModificationDate
    );

    resolvedFileWithLibrary = new ResolvedFile(
      sourceName,
      absolutePath,
      content,
      "<content-hash-file-with-library>",
      lastModificationDate,
      libraryName,
      libraryVersion
    );
  });

  it("should be constructed correctly without a library", function () {
    assertResolvedFilePartiallyEquals(resolvedFileWithoutLibrary, {
      sourceName,
      absolutePath,
      content,
      lastModificationDate,
      library: undefined,
    });
  });

  it("Should be constructed correctly with a library", function () {
    assertResolvedFilePartiallyEquals(resolvedFileWithLibrary, {
      sourceName,
      absolutePath,
      content,
      lastModificationDate,
      library: {
        name: libraryName,
        version: libraryVersion,
      },
    });
  });

  describe("getVersionedName", function () {
    it("Should give the source name if the file isn't from a library", function () {
      assert.equal(resolvedFileWithoutLibrary.getVersionedName(), sourceName);
    });

    it("Should add the version if the file is from a library", function () {
      assert.equal(
        resolvedFileWithLibrary.getVersionedName(),
        `${sourceName}@v${libraryVersion}`
      );
    });
  });
});

async function assertResolvedFileFromPath(
  resolverPromise: Promise<ResolvedFile>,
  expectedSourceName: string,
  filePath: string,
  libraryInfo?: LibraryInfo
) {
  const resolved = await resolverPromise;
  const absolutePath = await fsExtra.realpath(filePath);

  assert.equal(resolved.sourceName, expectedSourceName);
  assert.equal(resolved.absolutePath, absolutePath);
  assert.deepEqual(resolved.library, libraryInfo);

  const { ctime } = await fsExtra.stat(absolutePath);
  assert.equal(resolved.lastModificationDate.valueOf(), ctime.valueOf());
}

describe("Resolver", function () {
  const projectName = "resolver-tests-project";
  useFixtureProject(projectName);
  let resolver: Resolver;
  let projectPath: string;

  before("Get project path", async function () {
    projectPath = await getFixtureProjectPath(projectName);
  });

  beforeEach("Init resolver", async function () {
    resolver = new Resolver(projectPath, new Parser(), (absolutePath) =>
      fsExtra.readFile(absolutePath, { encoding: "utf8" })
    );
  });

  describe("resolveSourceName", function () {
    it("Should validate the source name format", async function () {
      await expectHardhatErrorAsync(
        () => resolver.resolveSourceName("asd\\asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_BACKSLASHES
      );

      await expectHardhatErrorAsync(
        () => resolver.resolveSourceName(slash(__dirname)),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_ABSOLUTE_PATH
      );
    });

    describe("Local vs library distinction", function () {
      it("Should be local if it exists in the project", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveSourceName("contracts/c.sol"),
          "contracts/c.sol",
          path.join(projectPath, "contracts/c.sol")
        );
      });

      it("Should be a library if it starts with node_modules", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("node_modules/lib/l.sol"),
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED
        );
      });

      it("Should be local if its first directory exists in the project, even it it doesn't exist", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("contracts/non-existent.sol"),
          ERRORS.RESOLVER.FILE_NOT_FOUND
        );
      });

      it("Should be a library its first directory doesn't exist in the project", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveSourceName("lib/l.sol"),
          "lib/l.sol",
          path.join(projectPath, "node_modules/lib/l.sol"),
          { name: "lib", version: "1.0.0" }
        );
      });
    });

    describe("Local files", function () {
      it("Should resolve an existing file", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveSourceName("contracts/c.sol"),
          "contracts/c.sol",
          path.join(projectPath, "contracts/c.sol")
        );

        await assertResolvedFileFromPath(
          resolver.resolveSourceName("other/o.sol"),
          "other/o.sol",
          path.join(projectPath, "other/o.sol")
        );
      });

      it("Should fail if the casing is incorrect", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("contracts/C.sol"),
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("contracts/c.Sol"),
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("contractS/c.sol"),
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        );
      });

      it("Should fail with FILE_NOT_FOUND if the first directory exists but the file doesn't", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("contracts/non-existent.sol"),
          ERRORS.RESOLVER.FILE_NOT_FOUND
        );
      });

      it("Should fail with FILE_NOT_FOUND if the first directory exists but the file doesn't, even if the casing of the first dir is wrong", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("contractS/non-existent.sol"),
          ERRORS.RESOLVER.FILE_NOT_FOUND
        );
      });
    });

    describe("Library files", function () {
      it("Should resolve to the node_modules file", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveSourceName("lib/l.sol"),
          "lib/l.sol",
          path.join(projectPath, "node_modules/lib/l.sol"),
          { name: "lib", version: "1.0.0" }
        );
      });

      it("Should fail if the casing is incorrect", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("lib/L.sol"),
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("lib/l.Sol"),
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        );

        // This error is platform dependant, as when resolving a library name
        // we use node's resolution algorithm, and it's case-sensitive or not
        // depending on the platform.
        if (process.platform === "win32" || process.platform === "darwin") {
          await expectHardhatErrorAsync(
            () => resolver.resolveSourceName("liB/l.sol"),
            ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
          );
        } else {
          await expectHardhatErrorAsync(
            () => resolver.resolveSourceName("liB/l.sol"),
            ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED
          );
        }
      });

      it("Should fail if the library is not installed", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("not-installed/l.sol"),
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED
        );
      });

      it("Should fail if the library is installed byt the file not found", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveSourceName("lib/l2.sol"),
          ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
        );
      });
    });
  });

  describe("resolveImport", function () {
    let localFrom: ResolvedFile;
    let libraryFrom: ResolvedFile;

    before(function () {
      localFrom = new ResolvedFile(
        "contracts/c.sol",
        path.join(projectPath, "contracts/c.sol"),
        {
          rawContent: "asd",
          imports: [],
          versionPragmas: [],
        },
        "<content-hash-c>",
        new Date()
      );

      libraryFrom = new ResolvedFile(
        "lib/l.sol",
        path.join(projectPath, "node_modules/lib/l.sol"),
        {
          rawContent: "asd",
          imports: [],
          versionPragmas: [],
        },
        "<content-hash-l>",
        new Date(),
        "lib",
        "1.0.0"
      );
    });

    describe("Invalid imports", function () {
      it("shouldn't let you import something using http or other protocols", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "http://google.com"),
          ERRORS.RESOLVER.INVALID_IMPORT_PROTOCOL
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveImport(libraryFrom, "https://google.com"),
          ERRORS.RESOLVER.INVALID_IMPORT_PROTOCOL
        );
      });

      it("shouldn't let you import something using backslashes", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "sub\\a.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_BACKSLASH
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveImport(libraryFrom, "sub\\a.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_BACKSLASH
        );
      });

      it("shouldn't let you import something using an absolute path", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "/asd"),
          ERRORS.RESOLVER.INVALID_IMPORT_ABSOLUTE_PATH
        );
      });
    });

    describe("Absolute imports", function () {
      it("Accept non-normalized imports", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(localFrom, "other/asd/../o.sol"),
          "other/o.sol",
          path.join(projectPath, "other/o.sol")
        );
      });

      it("Should accept non-top-level files from libraries", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(libraryFrom, "lib/sub/a.sol"),
          "lib/sub/a.sol",
          path.join(projectPath, "node_modules/lib/sub/a.sol"),
          {
            name: "lib",
            version: "1.0.0",
          }
        );
      });

      it("should resolve @scoped/libraries", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(libraryFrom, "@scoped/library/d/l.sol"),
          "@scoped/library/d/l.sol",
          path.join(projectPath, "node_modules/@scoped/library/d/l.sol"),
          {
            name: "@scoped/library",
            version: "1.0.0",
          }
        );
      });

      it("shouldn't let you import something from an uninstalled library", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "non-installed/asd.sol"),
          ERRORS.RESOLVER.IMPORTED_LIBRARY_NOT_INSTALLED
        );
      });

      it("should fail if importing a missing file", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "lib/asd.sol"),
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "contracts/asd.sol"),
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
        );
      });

      it("should fail if importing a file with the incorrect casing", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "lib/L.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "contracts/C.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING
        );
      });

      it("Should accept local files from different directories", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(localFrom, "other/o.sol"),
          "other/o.sol",
          path.join(projectPath, "other/o.sol")
        );

        await assertResolvedFileFromPath(
          resolver.resolveImport(localFrom, "contracts/c.sol"),
          "contracts/c.sol",
          path.join(projectPath, "contracts/c.sol")
        );
      });

      it("Should accept imports from a library into another one", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(libraryFrom, "lib2/l2.sol"),
          "lib2/l2.sol",
          path.join(projectPath, "node_modules/lib2/l2.sol"),
          {
            name: "lib2",
            version: "1.0.0",
          }
        );
      });

      it("Should forbid local imports from libraries", async function () {
        // TODO: Should we implement this?
      });

      it("Should resolve libraries that have been installed with a different name successfully", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(
            localFrom,
            "library-with-other-name-1.2.3/c.sol"
          ),
          "library-with-other-name-1.2.3/c.sol",
          path.join(
            projectPath,
            "node_modules/library-with-other-name-1.2.3/c.sol"
          ),
          {
            name: "library-with-other-name-1.2.3",
            version: "1.2.3",
          }
        );
      });

      it("Should resolve linked libraries correctly", async function () {
        if (process.platform === "win32") {
          this.skip();
          return;
        }

        await assertResolvedFileFromPath(
          resolver.resolveImport(localFrom, "linked-library/c.sol"),
          "linked-library/c.sol",
          path.join(projectPath, "library/c.sol"),
          {
            name: "linked-library",
            version: "1.2.4",
          }
        );
      });
    });

    describe("Relative imports", function () {
      it("shouldn't let you import something outside of the project from a local file", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "../../asd.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_OUTSIDE_OF_PROJECT
        );
      });

      it("shouldn't let you import something from a library that is outside of it", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(libraryFrom, "../asd.sol"),
          ERRORS.RESOLVER.ILLEGAL_IMPORT
        );
      });

      it("Accept non-normalized imports", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(localFrom, "../other/asd/../o.sol"),
          "other/o.sol",
          path.join(projectPath, "other/o.sol")
        );
      });

      it("should fail if importing a missing file", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(libraryFrom, "./asd.sol"),
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "../other/asd.sol"),
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
        );
      });

      it("should fail if importing a file with the incorrect casing", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(libraryFrom, "./sub/A.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING
        );

        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "./sub/A.sol"),
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING
        );
      });

      it("Should always treat relative imports from local files as local", async function () {
        await expectHardhatErrorAsync(
          () => resolver.resolveImport(localFrom, "../not-a-library/A.sol"),
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
        );
      });

      it("Should let you import a library file with its relative path from a local file", async function () {
        await assertResolvedFileFromPath(
          resolver.resolveImport(localFrom, "../node_modules/lib/l.sol"),
          "lib/l.sol",
          path.join(projectPath, "node_modules/lib/l.sol"),
          {
            name: "lib",
            version: "1.0.0",
          }
        );
      });
    });
  });
});

describe("Resolver regression tests", function () {
  describe("Project with a hardhat subdirectory", function () {
    const projectName = "project-with-hardhat-directory";
    useFixtureProject(projectName);
    useEnvironment();

    // This test ensures the resolver lets you compile a project with the packaged console.sol
    // in a Hardhat project that has a "hardhat" subdirectory.
    // See issue https://github.com/nomiclabs/hardhat/issues/998
    it("Should compile the Greeter contract that imports console.log from hardhat", async function () {
      return this.env.run(TASK_COMPILE, { quiet: true });
    });
  });
});
