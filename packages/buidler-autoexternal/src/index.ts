import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { internalTask } from "@nomiclabs/buidler/config";
import { ProjectPaths, ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";
import path from "path";

const autoexternalContractsCacheDirName = "autoexternal";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerConfig {
    autoexternal?: Partial<AutoexternalConfig>;
  }
}

export interface AutoexternalConfig {
  enableForFileAnnotation: string;
  exportableFunctionNamePattern: RegExp;
  contractNameTransformer: (orignalContractName: string) => string;
  functionNameTransformer: (orignalFunctionName: string) => string;
}

export const DEFAULT_CONFIG: AutoexternalConfig = {
  enableForFileAnnotation: "#enable-buidler-autoexternal",
  exportableFunctionNamePattern: /^_/,
  contractNameTransformer: (name: string) => "Testable" + name,
  functionNameTransformer: (name: string) => name.substr(1)
};

function getAutoexternalConfig(
  config: ResolvedBuidlerConfig
): AutoexternalConfig {
  const autoexternalConfig =
    config.autoexternal !== undefined ? config.autoexternal : {};

  return {
    ...DEFAULT_CONFIG,
    ...autoexternalConfig
  };
}

interface TestableContract {
  name: string;
  originalName: string;
  exportedFunctions: string[];
}

internalTask(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
  const filePaths: string[] = await runSuper();

  const autoexternalConfig = getAutoexternalConfig(config);
  const testableContractPaths = await generateTestableContracts(
    config.paths,
    autoexternalConfig,
    filePaths
  );

  return [...filePaths, ...testableContractPaths];
});

async function generateTestableContracts(
  paths: ProjectPaths,
  autoexternalConfig: AutoexternalConfig,
  contractPaths: string[]
): Promise<string[]> {
  const testableContractPaths = [];

  for (const contractPath of contractPaths) {
    const testableContract = await generateTestableContract(
      paths,
      autoexternalConfig,
      contractPath
    );

    if (testableContract !== undefined) {
      testableContractPaths.push(testableContract);
    }
  }

  return testableContractPaths;
}

export async function generateTestableContract(
  paths: ProjectPaths,
  autoexternalConfig: AutoexternalConfig,
  contractPath: string
): Promise<string | undefined> {
  const fsExtra = await import("fs-extra");

  const content = await fsExtra.readFile(contractPath, "utf-8");

  const {
    contractNameTransformer,
    exportableFunctionNamePattern,
    enableForFileAnnotation,
    functionNameTransformer
  } = autoexternalConfig;

  if (!content.includes(enableForFileAnnotation)) {
    return undefined;
  }

  const globalName = path.relative(paths.root, contractPath);

  const testableFilePath = path.join(
    paths.cache,
    autoexternalContractsCacheDirName,
    path.relative(paths.sources, contractPath)
  );

  if (await isAlreadyCreated(contractPath, testableFilePath)) {
    return undefined;
  }

  await fsExtra.ensureDir(path.dirname(testableFilePath));

  const { default: parser } = await import("solidity-parser-antlr");
  const parsedFile = await parseFile(parser, globalName, content);

  if (parsedFile === undefined) {
    return undefined;
  }

  const pragmasSection = getPragmasSection(parser, parsedFile);

  const importsSection = getImportsSection(
    paths.root,
    globalName,
    testableFilePath
  );

  const contracts: TestableContract[] = [];

  parser.visit(parsedFile, {
    ContractDefinition(contractNode: any) {
      const contract: TestableContract = {
        name: contractNameTransformer(contractNode.name),
        originalName: contractNode.name,
        exportedFunctions: []
      };

      parser.visit(contractNode, {
        FunctionDefinition(functionNode: any) {
          if (
            functionNode.visibility === "internal" &&
            exportableFunctionNamePattern.test(functionNode.name)
          ) {
            contract.exportedFunctions.push(
              getExportedFunctionDefinition(
                functionNode,
                content,
                functionNameTransformer
              )
            );
          }
        }
      });

      contracts.push(contract);
    }
  });

  const newFileContent =
    pragmasSection +
    "\n\n" +
    importsSection +
    "\n\n" +
    contracts.map(contract => getContractSource(contract)).join("\n\n") +
    "\n";

  await fsExtra.writeFile(testableFilePath, newFileContent, "utf-8");

  return testableFilePath;
}

async function parseFile(
  parser: any,
  globalName: string,
  content: string
): Promise<any> {
  try {
    return parser.parse(content, { range: true });
  } catch (error) {
    if (error instanceof parser.ParserError) {
      console.warn(
        "Failed to parse " +
          globalName +
          " which has a testable-contracts annotation. No testable contract will be generated for this file."
      );
    } else {
      throw error;
    }
  }
}

function getPragmasSection(parser: any, parsedFile: any): string {
  const pragmas: string[] = [];

  parser.visit(parsedFile, {
    PragmaDirective(node: any) {
      pragmas.push("pragma " + node.name + " " + node.value + ";");
    }
  });

  return pragmas.join("\n");
}

function getImportsSection(
  projectRoot: string,
  originalFileGlobalName: string,
  testableFilePath: string
) {
  const absolutePathToOriginalFile = path.join(
    projectRoot,
    originalFileGlobalName
  );

  const pathToImport = path.relative(
    path.dirname(testableFilePath),
    absolutePathToOriginalFile
  );

  // What to do here is not 100% clear. Escaping special characters doesn't
  // seem to work everywhere. But this should cover the bast majority of cases.
  if (pathToImport.includes('"')) {
    return `import '${pathToImport}';`;
  }

  return `import "${pathToImport}";`;
}

function getExportedFunctionDefinition(
  functionNode: any,
  fileContent: string,
  functionNameTransformer: (name: string) => string
): string {
  const functionName: string = functionNode.name;
  const functionDefinition = fileContent
    .substring(functionNode.range[0], functionNode.range[1] + 1)
    .trim();

  const functionSignature = functionDefinition.substring(
    0,
    functionDefinition.indexOf("{")
  );

  const newSignature = functionSignature
    .replace(functionName, functionNameTransformer(functionName))
    .replace(/\binternal\b/, "external");

  const argumentsDeclaration = newSignature
    .substring(newSignature.indexOf("(") + 1, newSignature.indexOf(")"))
    .trim();

  let argumentNames: string[] = [];

  if (argumentsDeclaration !== "") {
    argumentNames = argumentsDeclaration.split(",").map(part =>
      part
        .trim()
        .split(/\s+/)[1]
        .trim()
    );
  }

  const superCall = `super.${functionName}(${argumentNames.join(", ")})`;

  return newSignature + "{\n" + "  " + "return " + superCall + ";\n}";
}

function indent(source: string, indentation: string = "  ") {
  return source
    .split("\n")
    .map(line => (line.trim() !== "" ? indentation + line : ""))
    .join("\n");
}

function getContractSource(contract: TestableContract) {
  let source = `contract ${contract.name} is ${contract.originalName} {\n`;

  if (contract.exportedFunctions.length > 0) {
    source +=
      "\n" +
      contract.exportedFunctions.map(f => indent(f)).join("\n\n") +
      "\n\n";
  }

  source += `}`;

  return source;
}

async function isAlreadyCreated(
  originalFilePath: string,
  testableFilePath: string
) {
  const fsExtra = await import("fs-extra");

  if (!(await fsExtra.pathExists(testableFilePath))) {
    return false;
  }

  const originalFileStats = await fsExtra.stat(originalFilePath);
  const testableFileStats = await fsExtra.stat(testableFilePath);

  return originalFileStats.mtime.getTime() < testableFileStats.mtime.getTime();
}
