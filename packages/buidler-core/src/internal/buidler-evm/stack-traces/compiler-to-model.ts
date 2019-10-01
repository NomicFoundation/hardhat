import abi from "ethereumjs-abi";

import {
  CompilerInput,
  CompilerOutput,
  CompilerOutputBytecode
} from "./compiler-types";
import {
  getLibraryAddressPositions,
  normalizeCompilerOutputBytecode
} from "./library-utils";
import {
  Bytecode,
  Contract,
  ContractFunction,
  ContractFunctionType,
  ContractFunctionVisibility,
  ContractType,
  SourceFile,
  SourceLocation
} from "./model";
import { decodeInstructions } from "./source-maps";

export function createModelsAndDecodeBytecodes(
  solcVersion: string,
  compilerInput: CompilerInput,
  compilerOutput: CompilerOutput
): Bytecode[] {
  const fileIdToSourceFile = new Map<number, SourceFile>();
  const contractIdToContract = new Map<number, Contract>();

  createSourcesModelFromAst(
    compilerOutput,
    compilerInput,
    fileIdToSourceFile,
    contractIdToContract
  );

  const bytecodes = decodeBytecodes(
    solcVersion,
    compilerOutput,
    fileIdToSourceFile,
    contractIdToContract
  );

  correctSelectors(bytecodes, compilerOutput);

  return bytecodes;
}

function createSourcesModelFromAst(
  compilerOutput: CompilerOutput,
  compilerInput: CompilerInput,
  fileIdToSourceFile: Map<number, SourceFile>,
  contractIdToContract: Map<number, Contract>
) {
  const contractIdToLinearizedBaseContractIds = new Map<number, number[]>();

  for (const [globalName, source] of Object.entries(compilerOutput.sources)) {
    const file = new SourceFile(
      globalName,
      compilerInput.sources[globalName].content
    );

    fileIdToSourceFile.set(source.id, file);

    for (const contractNode of source.ast.nodes) {
      if (contractNode.nodeType !== "ContractDefinition") {
        continue;
      }

      const contractType = contractKindToContractType(
        contractNode.contractKind
      );

      if (contractType === undefined) {
        continue;
      }

      processContractAstNode(
        file,
        contractNode,
        fileIdToSourceFile,
        contractType,
        contractIdToContract,
        contractIdToLinearizedBaseContractIds
      );
    }
  }

  applyContractsInheritance(
    contractIdToContract,
    contractIdToLinearizedBaseContractIds
  );
}

function processContractAstNode(
  file: SourceFile,
  contractNode: any,
  fileIdToSourceFile: Map<number, SourceFile>,
  contractType: ContractType,
  contractIdToContract: Map<number, Contract>,
  contractIdToLinearizedBaseContractIds: Map<number, number[]>
) {
  const contractLocation = astSrcToSourceLocation(
    contractNode.src,
    fileIdToSourceFile
  )!;

  const contract = new Contract(
    contractNode.name,
    contractType,
    contractLocation
  );

  contractIdToContract.set(contractNode.id, contract);
  contractIdToLinearizedBaseContractIds.set(
    contractNode.id,
    contractNode.linearizedBaseContracts
  );

  file.addContract(contract);

  for (const node of contractNode.nodes) {
    if (node.nodeType === "FunctionDefinition") {
      processFunctionDefinitionAstNode(
        node,
        fileIdToSourceFile,
        contract,
        file
      );
    } else if (node.nodeType === "ModifierDefinition") {
      processModifierDefinitionAstNode(
        node,
        fileIdToSourceFile,
        contract,
        file
      );
    } else if (node.nodeType === "VariableDeclaration") {
      processVariableDeclarationAstNode(
        node,
        fileIdToSourceFile,
        contract,
        file
      );
    }
  }
}

function processFunctionDefinitionAstNode(
  functionDefinitionNode: any,
  fileIdToSourceFile: Map<number, SourceFile>,
  contract: Contract,
  file: SourceFile
) {
  if (functionDefinitionNode.implemented === false) {
    return;
  }

  const functionType = functionDefinitionKindToFunctionType(
    functionDefinitionNode.kind
  );
  const functionLocation = astSrcToSourceLocation(
    functionDefinitionNode.src,
    fileIdToSourceFile
  )!;
  const visibility = astVisibilityToVisibility(
    functionDefinitionNode.visibility
  );

  const cf = new ContractFunction(
    functionDefinitionNode.name,
    functionType,
    functionLocation,
    contract,
    visibility,
    functionDefinitionNode.stateMutability === "payable",
    functionType === ContractFunctionType.FUNCTION
      ? astFunctionDefinitionToSelector(functionDefinitionNode)
      : undefined
  );

  contract.addLocalFunction(cf);
  file.addFunction(cf);
}

function processModifierDefinitionAstNode(
  modifierDefinitionNode: any,
  fileIdToSourceFile: Map<number, SourceFile>,
  contract: Contract,
  file: SourceFile
) {
  const functionLocation = astSrcToSourceLocation(
    modifierDefinitionNode.src,
    fileIdToSourceFile
  )!;

  const cf = new ContractFunction(
    modifierDefinitionNode.name,
    ContractFunctionType.MODIFIER,
    functionLocation,
    contract
  );

  contract.addLocalFunction(cf);
  file.addFunction(cf);
}

function getPublicVariableSelectorFromDeclarationAstNode(
  variableDeclaration: any
) {
  const paramTypes: string[] = [];

  let nextType = variableDeclaration.typeName;
  while (true) {
    if (nextType.nodeType === "Mapping") {
      paramTypes.push(toCanonicalAbiType(nextType.keyType.name));

      nextType = nextType.valueType;
    } else {
      if (nextType.nodeType === "ArrayTypeName") {
        paramTypes.push("uint256");
      }

      break;
    }
  }

  return abi.methodID(variableDeclaration.name, paramTypes);
}

function processVariableDeclarationAstNode(
  variableDeclarationNode: any,
  fileIdToSourceFile: Map<number, SourceFile>,
  contract: Contract,
  file: SourceFile
) {
  const visibility = astVisibilityToVisibility(
    variableDeclarationNode.visibility
  );

  // Variables can't be external
  if (visibility !== ContractFunctionVisibility.PUBLIC) {
    return;
  }

  const functionLocation = astSrcToSourceLocation(
    variableDeclarationNode.src,
    fileIdToSourceFile
  )!;

  const cf = new ContractFunction(
    variableDeclarationNode.name,
    ContractFunctionType.GETTER,
    functionLocation,
    contract,
    visibility,
    false, // Getters aren't payable
    getPublicVariableSelectorFromDeclarationAstNode(variableDeclarationNode)
  );

  contract.addLocalFunction(cf);
  file.addFunction(cf);
}

function applyContractsInheritance(
  contractIdToContract: Map<number, Contract>,
  contractIdToLinearizedBaseContractIds: Map<number, number[]>
) {
  for (const [cid, contract] of contractIdToContract.entries()) {
    const inheritanceIds = contractIdToLinearizedBaseContractIds.get(cid)!;

    for (const baseId of inheritanceIds) {
      const baseContract = contractIdToContract.get(baseId);

      if (baseContract === undefined) {
        // This list includes interface, which we don't model
        continue;
      }

      contract.addNextLinearizedBaseContract(baseContract);
    }
  }
}

function decodeBytecodes(
  solcVersion: string,
  compilerOutput: CompilerOutput,
  fileIdToSourceFile: Map<number, SourceFile>,
  contractIdToContract: Map<number, Contract>
): Bytecode[] {
  const bytecodes: Bytecode[] = [];

  for (const contract of contractIdToContract.values()) {
    const contractFile = contract.location.file.globalName;
    const contractEvmOutput =
      compilerOutput.contracts[contractFile][contract.name].evm;

    // This is an abstract contract
    if (contractEvmOutput.bytecode.object === "") {
      continue;
    }

    const deploymentBytecode = decodeEvmBytecode(
      contract,
      solcVersion,
      true,
      contractEvmOutput.bytecode,
      fileIdToSourceFile
    );

    const runtimeBytecode = decodeEvmBytecode(
      contract,
      solcVersion,
      false,
      contractEvmOutput.deployedBytecode,
      fileIdToSourceFile
    );

    bytecodes.push(deploymentBytecode);
    bytecodes.push(runtimeBytecode);
  }

  return bytecodes;
}

function decodeEvmBytecode(
  contract: Contract,
  solcVersion: string,
  isDeployment: boolean,
  compilerBytecode: CompilerOutputBytecode,
  fileIdToSourceFile: Map<number, SourceFile>
): Bytecode {
  const libraryAddressPositions = getLibraryAddressPositions(compilerBytecode);

  const normalizedCode = normalizeCompilerOutputBytecode(
    compilerBytecode.object,
    libraryAddressPositions
  );

  const instructions = decodeInstructions(
    normalizedCode,
    compilerBytecode.sourceMap,
    fileIdToSourceFile
  );

  return new Bytecode(
    contract,
    isDeployment,
    normalizedCode,
    instructions,
    libraryAddressPositions,
    solcVersion
  );
}

function astSrcToSourceLocation(
  src: string,
  fileIdToSourceFile: Map<number, SourceFile>
): SourceLocation | undefined {
  const [offset, length, fileId] = src.split(":").map(p => +p);
  const file = fileIdToSourceFile.get(fileId);

  if (file === undefined) {
    return undefined;
  }

  return new SourceLocation(file, offset, length);
}

function contractKindToContractType(
  contractKind?: string
): ContractType | undefined {
  if (contractKind === "library") {
    return ContractType.LIBRARY;
  }

  if (contractKind === "contract") {
    return ContractType.CONTRACT;
  }

  return undefined;
}

function astVisibilityToVisibility(
  visibility: string
): ContractFunctionVisibility {
  if (visibility === "private") {
    return ContractFunctionVisibility.PRIVATE;
  }

  if (visibility === "internal") {
    return ContractFunctionVisibility.INTERNAL;
  }

  if (visibility === "public") {
    return ContractFunctionVisibility.PUBLIC;
  }

  return ContractFunctionVisibility.EXTERNAL;
}

function functionDefinitionKindToFunctionType(
  kind: string
): ContractFunctionType {
  if (kind === "constructor") {
    return ContractFunctionType.CONSTRUCTOR;
  }

  if (kind === "fallback") {
    return ContractFunctionType.FALLBACK;
  }

  return ContractFunctionType.FUNCTION;
}

function astFunctionDefinitionToSelector(functionDefinition: any): Buffer {
  const paramTypes: string[] = [];

  for (const param of functionDefinition.parameters.parameters) {
    if (isContractType(param)) {
      paramTypes.push("address");
      continue;
    }

    if (isEnumType(param)) {
      // TODO: If the enum has >= 256 elements this will fail. It should be a uint16. This is
      //  complicated, as enums can be inherited. Fortunately, if multiple parent contracts
      //  define the same enum, solc fails to compile.
      paramTypes.push("uint8");
      continue;
    }

    if (param.typeName.nodeType === "ArrayTypeName") {
      paramTypes.push(`${toCanonicalAbiType(param.typeName.baseType.name)}[]`);
      continue;
    }

    paramTypes.push(toCanonicalAbiType(param.typeName.name));
  }

  return abi.methodID(functionDefinition.name, paramTypes);
}

function isContractType(param: any) {
  return (
    param.typeName.nodeType === "UserDefinedTypeName" &&
    param.typeDescriptions.typeString.startsWith("contract ")
  );
}

function isEnumType(param: any) {
  return (
    param.typeName.nodeType === "UserDefinedTypeName" &&
    param.typeDescriptions.typeString.startsWith("enum ")
  );
}

function toCanonicalAbiType(type: string): string {
  if (type.startsWith("int[")) {
    return `int256${type.slice(3)}`;
  }

  if (type === "int") {
    return "int256";
  }

  if (type.startsWith("uint[")) {
    return `uint256${type.slice(4)}`;
  }

  if (type === "uint") {
    return "uint256";
  }

  if (type.startsWith("fixed[")) {
    return `fixed128x128${type.slice(5)}`;
  }

  if (type === "fixed") {
    return "fixed128x128";
  }

  if (type.startsWith("ufixed[")) {
    return `ufixed128x128${type.slice(6)}`;
  }

  if (type === "ufixed") {
    return "ufixed128x128";
  }

  return type;
}

function correctSelectors(
  bytecodes: Bytecode[],
  compilerOutput: CompilerOutput
) {
  for (const bytecode of bytecodes) {
    if (bytecode.isDeployment) {
      continue;
    }

    const contract = bytecode.contract;
    const methodIdentifiers =
      compilerOutput.contracts[contract.location.file.globalName][contract.name]
        .evm.methodIdentifiers;

    for (const [signature, hexSelector] of Object.entries(methodIdentifiers)) {
      const functionName = signature.slice(0, signature.indexOf("("));
      const selector = Buffer.from(hexSelector, "hex");

      const contractFunction = contract.getFunctionFromSelector(selector);

      if (contractFunction !== undefined) {
        continue;
      }

      const fixedSelector = contract.correctSelector(functionName, selector);

      if (!fixedSelector) {
        // tslint:disable-next-line only-buidler-error
        throw new Error(
          `Failed to compute the selector one or more implementations of ${contract.name}#${functionName}. BuidlerEVM can automatically fix this problem if you don't use function overloading.`
        );
      }
    }
  }
}
