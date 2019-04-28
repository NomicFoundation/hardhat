import { ProjectPaths } from "@nomiclabs/buidler/types";
import path from "path";

import { AutoexternalConfig, SourceFile, TestableContract } from "./types";

const autoexternalContractsCacheDirName = "autoexternal";

/**
 * Generates the contracts for testing.
 *
 * @returns A tuple whose first element is an array of generated source paths,
 * and the second one an array of SourceFiles that failed to be processed.
 */
export async function generateTestableContracts(
  paths: ProjectPaths,
  autoexternalConfig: AutoexternalConfig,
  sourceCodePaths: string[]
): Promise<[string[], SourceFile[]]> {
  const generatedSourceFilePaths: string[] = [];
  const failedSourceFiles: SourceFile[] = [];

  for (const contractPath of sourceCodePaths) {
    const sourceFile = await readSourceFile(paths, contractPath);

    if (!shouldBeProcessed(sourceFile, autoexternalConfig)) {
      continue;
    }

    const testableFilePath = getGeneratedFilePath(paths, contractPath);

    if (await isAlreadyCreated(contractPath, testableFilePath)) {
      continue;
    }

    const testableContract = await processSourceFile(
      sourceFile,
      testableFilePath,
      paths,
      autoexternalConfig
    );

    if (testableContract === undefined) {
      failedSourceFiles.push(sourceFile);
      continue;
    }

    generatedSourceFilePaths.push(testableContract);
  }

  return [generatedSourceFilePaths, failedSourceFiles];
}

export function getGeneratedFilePath(
  paths: ProjectPaths,
  contractPath: string
) {
  return path.join(
    paths.cache,
    autoexternalContractsCacheDirName,
    path.relative(paths.sources, contractPath)
  );
}

export async function readSourceFile(
  paths: ProjectPaths,
  absolutePath: string
): Promise<SourceFile> {
  const fsExtra = await import("fs-extra");

  const content = await fsExtra.readFile(absolutePath, "utf-8");
  const globalName = path.relative(paths.root, absolutePath);

  return {
    absolutePath,
    globalName,
    content
  };
}

function shouldBeProcessed(
  sourceFile: SourceFile,
  autoexternalConfig: AutoexternalConfig
) {
  const annotation = autoexternalConfig.enableForFileAnnotation;
  return sourceFile.content.includes(annotation);
}

export async function processSourceFile(
  file: SourceFile,
  testableFilePath: string,
  paths: ProjectPaths,
  autoexternalConfig: AutoexternalConfig
): Promise<string | undefined> {
  const fsExtra = await import("fs-extra");

  const {
    contractNameTransformer,
    exportableFunctionNamePattern,
    functionNameTransformer
  } = autoexternalConfig;

  await fsExtra.ensureDir(path.dirname(testableFilePath));

  const { default: parser } = await import("solidity-parser-antlr");
  const parsedFile = await parseFile(parser, file.content);

  if (parsedFile === undefined) {
    return undefined;
  }

  const pragmasSection = getPragmasSection(parser, parsedFile);

  const importsSection = getImportsSection(
    paths.root,
    file.globalName,
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
                file.content,
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
  content: string
): Promise<any | undefined> {
  try {
    return parser.parse(content, { range: true });
  } catch (error) {
    if (error instanceof parser.ParserError) {
      return;
    }
    throw error;
  }
}

function getPragmasSection(parser: any, parsedFile: any): string {
  const pragmas: string[] = [];

  parser.visit(parsedFile, {
    PragmaDirective(node: any) {
      pragmas.push(`pragma ${node.name} ${node.value};`);
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
  functionNode: { name: string; range: [number, number] },
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
