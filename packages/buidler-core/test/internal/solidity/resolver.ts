import { assert } from "chai";
import * as fsExtra from "fs-extra";
import path from "path";

import { ERRORS } from "../../../src/internal/core/errors-list";
import { getImports } from "../../../src/internal/solidity/imports";
import {
  ResolvedFile,
  Resolver
} from "../../../src/internal/solidity/resolver";
import { expectBuidlerErrorAsync } from "../../helpers/errors";
import {
  getFixtureProjectPath,
  useFixtureProject
} from "../../helpers/project";

function assertResolvedFile(
  actual: ResolvedFile,
  expected: Partial<ResolvedFile>
) {
  for (const key of Object.keys(expected)) {
    const typedKey = key as keyof ResolvedFile;
    assert.deepEqual(actual[typedKey], expected[typedKey]);
  }
}

describe("Resolved file", function() {
  const globalName = "globalName.sol";
  const absolutePath = "/path/to/file/globalName.sol";
  const content = "the file content";
  const lastModificationDate = new Date();
  const libraryName = "lib";
  const libraryVersion = "0.1.0";

  let resolvedFileWithoutLibrary: ResolvedFile;
  let resolvedFileWithLibrary: ResolvedFile;

  before("init files", function() {
    resolvedFileWithoutLibrary = new ResolvedFile(
      globalName,
      absolutePath,
      content,
      lastModificationDate
    );

    resolvedFileWithLibrary = new ResolvedFile(
      globalName,
      absolutePath,
      content,
      lastModificationDate,
      libraryName,
      libraryVersion
    );
  });

  it("should be constructed correctly without a library", function() {
    assertResolvedFile(resolvedFileWithoutLibrary, {
      globalName,
      absolutePath,
      content,
      lastModificationDate,
      library: undefined
    });
  });

  it("Should be constructed correctly with a library", function() {
    assertResolvedFile(resolvedFileWithLibrary, {
      globalName,
      absolutePath,
      content,
      lastModificationDate,
      library: {
        name: libraryName,
        version: libraryVersion
      }
    });
  });

  describe("getVersionedName", function() {
    it("Should give the global name if the file isn't from a library", function() {
      assert.equal(resolvedFileWithoutLibrary.getVersionedName(), globalName);
    });

    it("Should add the version if the file is from a library", function() {
      assert.equal(
        resolvedFileWithLibrary.getVersionedName(),
        `${globalName}@v${libraryVersion}`
      );
    });
  });
});

describe("Resolver", function() {
  describe("Project's files resolution", function() {
    const projectName = "top-level-node-project";
    useFixtureProject(projectName);

    let resolver: Resolver;
    before("Get project root", async function() {
      resolver = new Resolver(await getFixtureProjectPath(projectName));
    });

    it("should resolve from absolute paths", async function() {
      const absolutePath = await fsExtra.realpath("contracts/A.sol");
      const { ctime } = await fsExtra.stat(absolutePath);
      const resolved = await resolver.resolveProjectSourceFile(absolutePath);

      assertResolvedFile(resolved, {
        globalName: "contracts/A.sol",
        absolutePath,
        content: "A",
        lastModificationDate: ctime,
        library: undefined
      });

      const absolutePath2 = await fsExtra.realpath("contracts/subdir/C.sol");
      const { ctime: ctime2 } = await fsExtra.stat(absolutePath2);
      const resolved2 = await resolver.resolveProjectSourceFile(absolutePath2);

      assertResolvedFile(resolved2, {
        globalName: "contracts/subdir/C.sol",
        absolutePath: absolutePath2,
        content: "C",
        lastModificationDate: ctime2,
        library: undefined
      });
    });

    it("should resolve from the global name", async function() {
      const absolutePath = await fsExtra.realpath("contracts/B.sol");
      const { ctime } = await fsExtra.stat(absolutePath);
      const resolved = await resolver.resolveProjectSourceFile(
        "contracts/B.sol"
      );

      assertResolvedFile(resolved, {
        globalName: "contracts/B.sol",
        absolutePath,
        content: "B",
        lastModificationDate: ctime,
        library: undefined
      });
    });

    it("should resolve from a path relative to the project root", async function() {
      const absolutePath = await fsExtra.realpath("contracts/B.sol");
      const { ctime } = await fsExtra.stat(absolutePath);
      const resolved = await resolver.resolveProjectSourceFile(
        "./contracts/subdir/../B.sol"
      );

      assertResolvedFile(resolved, {
        globalName: "contracts/B.sol",
        absolutePath,
        content: "B",
        lastModificationDate: ctime,
        library: undefined
      });
    });

    it("should throw if a library file is resolved as a source file", async function() {
      const absolutePath = await fsExtra.realpath(
        "./node_modules/lib/contracts/L.sol"
      );

      await expectBuidlerErrorAsync(
        () =>
          resolver.resolveProjectSourceFile(
            "./node_modules/lib/contracts/L.sol"
          ),
        ERRORS.RESOLVER.LIBRARY_FILE_NOT_LOCAL
      );

      await expectBuidlerErrorAsync(
        () => resolver.resolveProjectSourceFile(absolutePath),
        ERRORS.RESOLVER.LIBRARY_FILE_NOT_LOCAL
      );
    });

    it("should throw if the file doesn't exist", async function() {
      await expectBuidlerErrorAsync(
        () => resolver.resolveProjectSourceFile("./contracts/NOT-FOUND.sol"),
        ERRORS.RESOLVER.FILE_NOT_FOUND
      );

      await expectBuidlerErrorAsync(
        () =>
          resolver.resolveProjectSourceFile(
            "./node_modules/lib/contracts/NOT-FOUND.sol"
          ),
        ERRORS.RESOLVER.FILE_NOT_FOUND
      );
    });

    it("should throw if the file is outside of the project root", async function() {
      await expectBuidlerErrorAsync(
        () =>
          resolver.resolveProjectSourceFile(
            path.join(
              __dirname,
              "..",
              "..",
              "..",
              "sample-project",
              "contracts",
              "Greeter.sol"
            )
          ),
        ERRORS.RESOLVER.FILE_OUTSIDE_PROJECT
      );
    });
  });

  describe("Library files resolution", function() {
    describe("With node_modules in the project root", function() {
      const projectName = "top-level-node-project";
      useFixtureProject(projectName);

      let resolver: Resolver;
      before("Get project root", async function() {
        resolver = new Resolver(await getFixtureProjectPath(projectName));
      });

      it("Should throw if the library isn't installed", async function() {
        await expectBuidlerErrorAsync(
          () => resolver.resolveLibrarySourceFile("uninstalled/A.sol"),
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED
        );
      });

      it("Should throw if the library is installed but the file is not found", async function() {
        await expectBuidlerErrorAsync(
          () => resolver.resolveLibrarySourceFile("lib/NOT-FOUND.sol"),
          ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
        );

        await expectBuidlerErrorAsync(
          () => resolver.resolveLibrarySourceFile("lib/../../contracts/A.sol"),
          ERRORS.RESOLVER.FILE_OUTSIDE_LIB
        );
      });

      it("Should resolve existing files", async function() {
        const absolutePath = await fsExtra.realpath(
          "node_modules/lib/contracts/L.sol"
        );
        const { ctime } = await fsExtra.stat(absolutePath);
        const resolved = await resolver.resolveLibrarySourceFile(
          "lib/contracts/L.sol"
        );

        assertResolvedFile(resolved, {
          globalName: "lib/contracts/L.sol",
          absolutePath,
          content: "L",
          lastModificationDate: ctime,
          library: {
            name: "lib",
            version: "1.2.3"
          }
        });

        const absolutePath2 = await fsExtra.realpath(
          "node_modules/lib/contracts/subdir/L3.sol"
        );
        const { ctime: ctime2 } = await fsExtra.stat(absolutePath2);
        const resolved2 = await resolver.resolveLibrarySourceFile(
          "lib/contracts/subdir/L3.sol"
        );

        assertResolvedFile(resolved2, {
          globalName: "lib/contracts/subdir/L3.sol",
          absolutePath: absolutePath2,
          content: "L3",
          lastModificationDate: ctime2,
          library: {
            name: "lib",
            version: "1.2.3"
          }
        });
      });
    });

    describe("Project nested inside another node project", function() {
      const projectName = "nested-node-project/project";
      useFixtureProject(projectName);

      let resolver: Resolver;
      before("Get project root", async function() {
        resolver = new Resolver(await getFixtureProjectPath(projectName));
      });

      it("should resolve a file of a library from the inner node_modules", async function() {
        const absolutePath = await fsExtra.realpath(
          "node_modules/inner/contracts/L.sol"
        );
        const { ctime } = await fsExtra.stat(absolutePath);
        const resolved = await resolver.resolveLibrarySourceFile(
          "inner/contracts/L.sol"
        );

        assertResolvedFile(resolved, {
          globalName: "inner/contracts/L.sol",
          absolutePath,
          content: "L",
          lastModificationDate: ctime,
          library: {
            name: "inner",
            version: "0.1.0"
          }
        });
      });

      it("should resolve a file of a library from the outer node_modules", async function() {
        const absolutePath = await fsExtra.realpath(
          "../node_modules/outer/contracts/L.sol"
        );
        const { ctime } = await fsExtra.stat(absolutePath);
        const resolved = await resolver.resolveLibrarySourceFile(
          "outer/contracts/L.sol"
        );

        assertResolvedFile(resolved, {
          globalName: "outer/contracts/L.sol",
          absolutePath,
          content: "L",
          lastModificationDate: ctime,
          library: {
            name: "outer",
            version: "0.0.1"
          }
        });
      });

      describe("when a library is in more than one node_modules", async function() {
        it("should resolve a file that is only in the nearest node_modules", async function() {
          const absolutePath = await fsExtra.realpath(
            "node_modules/clashed/contracts/I.sol"
          );
          const { ctime } = await fsExtra.stat(absolutePath);
          const resolved = await resolver.resolveLibrarySourceFile(
            "clashed/contracts/I.sol"
          );

          assertResolvedFile(resolved, {
            globalName: "clashed/contracts/I.sol",
            absolutePath,
            content: "I",
            lastModificationDate: ctime,
            library: {
              name: "clashed",
              version: "2.0.0"
            }
          });
        });

        it("shouldn't resolve a file that is only in the outer node_modules", async function() {
          await expectBuidlerErrorAsync(
            () => resolver.resolveLibrarySourceFile("clashed/contracts/O.sol"),
            ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
          );
        });

        it("should resolve to the closest version in case of a file being included in both node_modules", async function() {
          const absolutePath = await fsExtra.realpath(
            "node_modules/clashed/contracts/L.sol"
          );
          const { ctime } = await fsExtra.stat(absolutePath);
          const resolved = await resolver.resolveLibrarySourceFile(
            "clashed/contracts/L.sol"
          );

          assertResolvedFile(resolved, {
            globalName: "clashed/contracts/L.sol",
            absolutePath,
            content: "INNER",
            lastModificationDate: ctime,
            library: {
              name: "clashed",
              version: "2.0.0"
            }
          });
        });
      });
    });
  });

  describe("Imports resolution", function() {
    const projectName = "top-level-node-project";
    useFixtureProject(projectName);

    let resolver: Resolver;
    let resolvedLocalFile: ResolvedFile;
    let resolvedLibFile: ResolvedFile;
    before("Get project root", async function() {
      resolver = new Resolver(await getFixtureProjectPath(projectName));
      resolvedLocalFile = await resolver.resolveProjectSourceFile(
        "contracts/A.sol"
      );
      resolvedLibFile = await resolver.resolveLibrarySourceFile(
        "lib/contracts/L.sol"
      );
    });

    it("Should resolve absolute imports as libraries", async function() {
      const absolutePath = await fsExtra.realpath(
        "node_modules/lib/contracts/L2.sol"
      );
      const { ctime } = await fsExtra.stat(absolutePath);
      const resolvedFromLocalFile = await resolver.resolveImport(
        resolvedLocalFile,
        "lib/contracts/L2.sol"
      );

      const resolvedFromLibFile = await resolver.resolveImport(
        resolvedLibFile,
        "lib/contracts/L2.sol"
      );

      const expected = {
        globalName: "lib/contracts/L2.sol",
        absolutePath,
        content: "L2",
        lastModificationDate: ctime,
        library: {
          name: "lib",
          version: "1.2.3"
        }
      };

      assertResolvedFile(resolvedFromLocalFile, expected);
      assertResolvedFile(resolvedFromLibFile, expected);
    });

    it("Should resolve relative imports from local files", async function() {
      const absolutePath = await fsExtra.realpath("contracts/B.sol");
      const { ctime } = await fsExtra.stat(absolutePath);
      const resolved = await resolver.resolveImport(
        resolvedLocalFile,
        "./subdir/../B.sol"
      );

      assertResolvedFile(resolved, {
        globalName: "contracts/B.sol",
        absolutePath,
        content: "B",
        lastModificationDate: ctime,
        library: undefined
      });
    });

    it("Should resolve relative imports from library files", async function() {
      const absolutePath = await fsExtra.realpath(
        "node_modules/lib/contracts/subdir/L3.sol"
      );
      const { ctime } = await fsExtra.stat(absolutePath);
      const resolved = await resolver.resolveImport(
        resolvedLibFile,
        "./subdir/L3.sol"
      );

      assertResolvedFile(resolved, {
        globalName: "lib/contracts/subdir/L3.sol",
        absolutePath,
        content: "L3",
        lastModificationDate: ctime,
        library: {
          name: "lib",
          version: "1.2.3"
        }
      });
    });

    it("Shouldn't allow relative imports from library files to escape the lib", async function() {
      await expectBuidlerErrorAsync(
        () =>
          resolver.resolveImport(
            resolvedLibFile,
            "../../../../../sample-project/contracts/Greeter.sol"
          ),
        ERRORS.RESOLVER.ILLEGAL_IMPORT
      );
    });

    it("Shouldn't allow relative imports from local files to escape the project", async function() {
      await expectBuidlerErrorAsync(
        () =>
          resolver.resolveImport(
            resolvedLocalFile,
            "../../../../sample-project/contracts/Greeter.sol"
          ),
        ERRORS.RESOLVER.FILE_OUTSIDE_PROJECT
      );
    });

    it("Should throw if imported file doesn't exist", async function() {
      await expectBuidlerErrorAsync(
        () => resolver.resolveImport(resolvedLocalFile, "./asd.sol"),
        ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
      );

      await expectBuidlerErrorAsync(
        () => resolver.resolveImport(resolvedLocalFile, "lib/asd.sol"),
        ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
      );

      await expectBuidlerErrorAsync(
        () => resolver.resolveImport(resolvedLibFile, "./asd.sol"),
        ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND
      );
    });
  });
});

describe("Scoped dependencies project", () => {
  const projectName = "scoped-dependency-project";
  useFixtureProject(projectName);

  before("Get project root", async function() {
    this.resolver = new Resolver(await getFixtureProjectPath(projectName));
    this.resolvedLocalFile = await this.resolver.resolveProjectSourceFile(
      "contracts/A.sol"
    );
  });

  it("should resolve scoped libraries properly", async function() {
    const imports = getImports(this.resolvedLocalFile.content);
    assert.isAbove(imports.length, 0);
    assert.equal(imports[0], "@scope/package/contracts/File.sol");
    const resolvedLibrary: ResolvedFile = await this.resolver.resolveImport(
      this.resolvedLocalFile,
      imports[0]
    );
    assert.isDefined(resolvedLibrary);
    assert.equal(resolvedLibrary.globalName, imports[0]);
    assert.equal(resolvedLibrary.library!.name, "@scope/package");
  });

  it("should retrieve the library name properly", function() {
    assert.equal(
      this.resolver._getLibraryName("@scoped/library/contracts/Contract.sol"),
      "@scoped/library"
    );
    assert.equal(
      this.resolver._getLibraryName("library/contracts/Contract.sol"),
      "library"
    );
  });

  it("should retrieve relative dependency inside library", async function() {
    const resolvedImporter = await this.resolver.resolveLibrarySourceFile(
      "@scope/package/contracts/nested/dir/Importer.sol"
    );
    const imports = getImports(resolvedImporter.content);
    assert.equal(imports[0], "../A.sol");

    const resolvedImported = await this.resolver.resolveImport(
      resolvedImporter,
      imports[0]
    );
    assert.equal(
      resolvedImported.globalName,
      "@scope/package/contracts/nested/A.sol"
    );
  });
});
