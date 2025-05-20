export interface VerifyActionArguments {
  address: string;
  constructorArgsPath?: string;
  constructorArgs?: string[];
  contract?: string;
  librariesPath?: string;
  force?: boolean;
  listNetworks?: boolean;
}
