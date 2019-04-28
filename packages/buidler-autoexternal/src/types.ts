export interface AutoexternalConfig {
  enableForFileAnnotation: string;
  exportableFunctionNamePattern: RegExp;
  contractNameTransformer: (orignalContractName: string) => string;
  functionNameTransformer: (orignalFunctionName: string) => string;
}

export interface TestableContract {
  name: string;
  originalName: string;
  exportedFunctions: string[];
}

export interface SourceFile {
  globalName: string;
  absolutePath: string;
  content: string;
}
