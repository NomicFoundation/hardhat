import { assert } from "chai";

import {
  createCompilationJobFromFile,
  createCompilationJobsFromConnectedComponent,
} from "../../../src/internal/solidity/compilation-job";
import { ResolvedFile } from "../../../src/internal/solidity/resolver";
import * as taskTypes from "../../../src/types/builtin-tasks";
import {
  CompilationJobCreationError,
  CompilationJobCreationErrorReason,
} from "../../../src/types/builtin-tasks";

import { createMockData, MockFile } from "./helpers";

const defaultSettings = {
  optimizer: {
    enabled: false,
    runs: 200,
  },
};

const optimizerEnabledSettings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};

const solc055 = { version: "0.5.5", settings: defaultSettings };
const solc055Optimized = {
  version: "0.5.5",
  settings: optimizerEnabledSettings,
};
const solc066 = { version: "0.6.6", settings: defaultSettings };

const solcConfig055 = {
  compilers: [solc055],
  overrides: {},
};
const solcConfig055Optimized = {
  compilers: [solc055Optimized],
  overrides: {},
};
const solcConfig055and066 = {
  compilers: [solc055, solc066],
  overrides: {},
};
const solcConfig066 = {
  compilers: [solc066],
  overrides: {},
};

function assertIsJob(
  result: taskTypes.CompilationJob | CompilationJobCreationError
): taskTypes.CompilationJob {
  if ("reason" in result) {
    assert.fail("The given compilation job result is an error");
  }
  return result;
}

function assertIsError(
  result: taskTypes.CompilationJob | CompilationJobCreationError
): CompilationJobCreationError {
  if (!("reason" in result)) {
    assert.fail("The given compilation job result is not an error");
  }

  return result;
}

describe("Compilation jobs", function () {
  describe("createCompilationJobFromFile", function () {
    describe("single file", function () {
      it("valid compiler", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
      });

      it("newest compiler is used", async function () {
        const FooMock = new MockFile("Foo", [">=0.5.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055and066
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.6.6");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
      });

      it("overridden compiler is used", async function () {
        const FooMock = new MockFile("Foo", [">=0.5.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          {
            ...solcConfig066,
            overrides: {
              [Foo.sourceName]: solc055,
            },
          }
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
      });

      it("invalid compiler", async function () {
        const FooMock = new MockFile("Foo", ["^0.6.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJobCreationError = assertIsError(
          compilationJobOrError
        );

        assert.equal(
          compilationJobCreationError.reason,
          CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND
        );
      });

      it("invalid overridden compiler", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          {
            ...solcConfig055,
            overrides: {
              [Foo.sourceName]: solc066,
            },
          }
        );

        const compilationJobCreationError = assertIsError(
          compilationJobOrError
        );

        assert.equal(
          compilationJobCreationError.reason,
          CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION
        );
      });
    });

    describe("two files", function () {
      it("file not imported is not included in job", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
          { file: BarMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
      });

      it("file imported is included in job", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const [dependencyGraph, [Foo, Bar]] = await createMockData([
          { file: FooMock, dependencies: [BarMock] },
          { file: BarMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo, Bar]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
        assert.isFalse(compilationJob.emitsArtifacts(Bar));
      });

      it("importer file is not included in job", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const [dependencyGraph, [Foo]] = await createMockData([
          { file: FooMock },
          { file: BarMock, dependencies: [FooMock] },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
      });

      it("incompatible import", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.6.0"]);
        const [dependencyGraph, [Foo, Bar]] = await createMockData([
          { file: FooMock, dependencies: [BarMock] },
          { file: BarMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055and066
        );

        const compilationJobCreationError = assertIsError(
          compilationJobOrError
        );

        assert.equal(
          compilationJobCreationError.reason,
          CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE
        );
        assert.deepEqual(
          compilationJobCreationError.extra.incompatibleDirectImports,
          [Bar]
        );
      });

      it("loop", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const [dependencyGraph, [Foo, Bar]] = await createMockData([
          { file: FooMock, dependencies: [BarMock] },
          { file: BarMock, dependencies: [FooMock] },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo, Bar]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
        assert.isFalse(compilationJob.emitsArtifacts(Bar));
      });
    });

    describe("three files", function () {
      it("transitive dependency", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const QuxMock = new MockFile("Qux", ["^0.5.0"]);
        const [dependencyGraph, [Foo, Bar, Qux]] = await createMockData([
          { file: FooMock, dependencies: [BarMock] },
          { file: BarMock, dependencies: [QuxMock] },
          { file: QuxMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo, Bar, Qux]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
        assert.isFalse(compilationJob.emitsArtifacts(Bar));
        assert.isFalse(compilationJob.emitsArtifacts(Qux));
      });

      it("imported by one and importing one", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const QuxMock = new MockFile("Qux", ["^0.5.0"]);
        const [dependencyGraph, [, Bar, Qux]] = await createMockData([
          { file: FooMock, dependencies: [BarMock] },
          { file: BarMock, dependencies: [QuxMock] },
          { file: QuxMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Bar,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Bar, Qux]);
        assert.isTrue(compilationJob.emitsArtifacts(Bar));
        assert.isFalse(compilationJob.emitsArtifacts(Qux));
      });

      it("two dependencies", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const QuxMock = new MockFile("Qux", ["^0.5.0"]);
        const [dependencyGraph, [Foo, Bar, Qux]] = await createMockData([
          { file: FooMock, dependencies: [BarMock, QuxMock] },
          { file: BarMock },
          { file: QuxMock },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo, Bar, Qux]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
        assert.isFalse(compilationJob.emitsArtifacts(Bar));
        assert.isFalse(compilationJob.emitsArtifacts(Qux));
      });

      it("loop", async function () {
        const FooMock = new MockFile("Foo", ["^0.5.0"]);
        const BarMock = new MockFile("Bar", ["^0.5.0"]);
        const QuxMock = new MockFile("Qux", ["^0.5.0"]);
        const [dependencyGraph, [Foo, Bar, Qux]] = await createMockData([
          { file: FooMock, dependencies: [BarMock] },
          { file: BarMock, dependencies: [QuxMock] },
          { file: QuxMock, dependencies: [FooMock] },
        ]);

        const compilationJobOrError = await createCompilationJobFromFile(
          dependencyGraph,
          Foo,
          solcConfig055
        );

        const compilationJob = assertIsJob(compilationJobOrError);

        assert.equal(compilationJob.getSolcConfig().version, "0.5.5");
        assert.sameMembers(compilationJob.getResolvedFiles(), [Foo, Bar, Qux]);
        assert.isTrue(compilationJob.emitsArtifacts(Foo));
        assert.isFalse(compilationJob.emitsArtifacts(Bar));
        assert.isFalse(compilationJob.emitsArtifacts(Qux));
      });
    });
  });

  describe("createCompilationJobsFromConnectedComponent", function () {
    it("single file (success)", async function () {
      const FooMock = new MockFile("Foo", ["^0.5.0"]);
      const [dependencyGraph] = await createMockData([{ file: FooMock }]);

      const { jobs, errors } =
        await createCompilationJobsFromConnectedComponent(
          dependencyGraph,
          (file: ResolvedFile) =>
            createCompilationJobFromFile(dependencyGraph, file, solcConfig055)
        );

      assert.lengthOf(jobs, 1);
      assert.isEmpty(errors);
    });

    it("single file (error)", async function () {
      const FooMock = new MockFile("Foo", ["^0.6.0"]);
      const [dependencyGraph, [Foo]] = await createMockData([
        { file: FooMock },
      ]);

      const { jobs, errors } =
        await createCompilationJobsFromConnectedComponent(
          dependencyGraph,
          (file: ResolvedFile) =>
            createCompilationJobFromFile(dependencyGraph, file, solcConfig055)
        );

      assert.lengthOf(jobs, 0);
      assert.sameDeepMembers(errors, [
        {
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
          file: Foo,
        },
      ]);
    });

    it("files without solc bug", async function () {
      const Importer1Mock = new MockFile("Importer1", ["^0.5.0"]);
      const Importer2Mock = new MockFile("Importer2", ["^0.5.0"]);
      const ImportedMock = new MockFile("Imported", ["^0.5.0"]);
      const [dependencyGraph] = await createMockData([
        { file: Importer1Mock, dependencies: [ImportedMock] },
        { file: Importer2Mock, dependencies: [ImportedMock] },
        { file: ImportedMock },
      ]);

      const { jobs, errors } =
        await createCompilationJobsFromConnectedComponent(
          dependencyGraph,
          (file: ResolvedFile) =>
            createCompilationJobFromFile(dependencyGraph, file, solcConfig055)
        );

      assert.lengthOf(jobs, 3);
      assert.isEmpty(errors);
    });

    it("files with solc bug", async function () {
      const Importer1Mock = new MockFile("Importer1", ["^0.5.0"]);
      const Importer2Mock = new MockFile("Importer2", ["^0.5.0"]);
      const ImportedMock = new MockFile("Imported", ["^0.5.0"]);
      const [dependencyGraph] = await createMockData([
        { file: Importer1Mock, dependencies: [ImportedMock] },
        { file: Importer2Mock, dependencies: [ImportedMock] },
        { file: ImportedMock },
      ]);

      const { jobs, errors } =
        await createCompilationJobsFromConnectedComponent(
          dependencyGraph,
          (file: ResolvedFile) =>
            createCompilationJobFromFile(
              dependencyGraph,
              file,
              solcConfig055Optimized
            )
        );

      assert.lengthOf(jobs, 1);
      assert.isEmpty(errors);
    });
  });
});
