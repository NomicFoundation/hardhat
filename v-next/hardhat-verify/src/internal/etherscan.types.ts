import type { BaseVerifyFunctionArgs } from "./types.js";

export interface EtherscanResponseBody {
  status: string;
  message: string;
  result: any;
}

export type EtherscanGetSourceCodeResponse =
  | EtherscanNotOkResponse
  | EtherscanGetSourceCodeOkResponse;

interface EtherscanGetSourceCodeOkResponse extends EtherscanResponseBody {
  status: "1";
  message: "OK";
  result: EtherscanContract[];
}

// TODO: maybe we don't need the complete contract interface
// and we can just use the SourceCode property
interface EtherscanContract {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
  SimilarMatch: string;
}

export type EtherscanResponse = EtherscanNotOkResponse | EtherscanOkResponse;

interface EtherscanNotOkResponse extends EtherscanResponseBody {
  status: "0";
  message: "NOTOK";
  result: string;
}

interface EtherscanOkResponse extends EtherscanResponseBody {
  status: "1";
  message: "OK";
  result: string;
}

export interface EtherscanChainListResponse {
  comments: string;
  totalcount: string;
  result: Array<{
    chainname: string;
    chainid: string;
    blockexplorer: string;
    apiurl: string;
    status: number;
    comment: string;
  }>;
}

export interface EtherscanVerifyArgs extends BaseVerifyFunctionArgs {
  constructorArguments: string;
}

export type EtherscanCustomApiCallOptions =
  | {
      method: "GET";
    }
  | {
      method: "POST";
      body?: Record<string, unknown>;
    };

/**
 * Provides access to the Etherscan API for contract verification and
 * custom API calls.
 *
 * This interface is designed for plugin authors who need direct access
 * to Etherscan's verification API beyond the standard verification
 * workflow. It can be accessed through `network.connect()` in the
 * Hardhat Runtime Environment.
 *
 * @example
 * ```typescript
 * const { verifier } = await hre.network.connect();
 * const etherscan = verifier.etherscan;
 *
 * // Use Etherscan methods
 * const isVerified = await etherscan.isVerified("0x1234...");
 * ```
 */
export interface LazyEtherscan {
  /**
   * Gets the chain ID that this Etherscan instance is configured for.
   *
   * @returns The chain ID as a string (e.g., "1" for Ethereum mainnet)
   */
  getChainId(): Promise<string>;

  /**
   * Gets the name of the block explorer.
   *
   * @returns The explorer name (e.g., "Etherscan", "BscScan",
   *   "PolygonScan")
   */
  getName(): Promise<string>;

  /**
   * Gets the base URL of the block explorer web interface.
   *
   * @returns The block explorer web URL (e.g., "https://etherscan.io")
   */
  getUrl(): Promise<string>;

  /**
   * Gets the API URL used for verification requests.
   *
   * @returns The API endpoint URL
   */
  getApiUrl(): Promise<string>;

  /**
   * Gets the configured API key for this Etherscan instance.
   *
   * @returns The API key
   */
  getApiKey(): Promise<string>;

  /**
   * Gets the block explorer URL for a specific contract address.
   *
   * @param address - The contract address
   * @returns The full URL to view the contract on the block explorer
   */
  getContractUrl(address: string): Promise<string>;

  /**
   * Checks whether a contract at the given address is verified on the
   * block explorer.
   *
   * @param address - The contract address to check
   * @returns True if the contract is verified, false otherwise
   */
  isVerified(address: string): Promise<boolean>;

  /**
   * Submits a contract for verification on the block explorer.
   *
   * @param args - The verification arguments containing:
   *   - contractAddress: The deployed contract address to verify
   *   - compilerInput: The Solidity compiler input JSON containing
   *     sources and settings
   *   - contractName: The fully qualified name of the contract
   *     (e.g., "contracts/Token.sol:Token")
   *   - compilerVersion: The Solidity compiler version used
   *     (e.g., "v0.8.19+commit.7dd6d404")
   *   - constructorArguments: The ABI-encoded constructor arguments
   *     as a hex string
   * @returns A GUID (Globally Unique Identifier) that can be used with
   *   `pollVerificationStatus()` to check the verification progress
   *
   * @throws {HardhatError} CONTRACT_VERIFICATION_MISSING_BYTECODE -
   *   If the contract bytecode is not found on the network
   * @throws {HardhatError} CONTRACT_ALREADY_VERIFIED -
   *   If the contract is already verified
   * @throws {HardhatError} CONTRACT_VERIFICATION_REQUEST_FAILED -
   *   If the verification request fails
   * @throws {HardhatError} EXPLORER_REQUEST_FAILED -
   *   If the HTTP request fails
   */
  verify(args: EtherscanVerifyArgs): Promise<string>;

  /**
   * Polls the block explorer to check the status of a pending
   * verification request.
   *
   * This method recursively polls the verification status until the
   * verification completes (either successfully or with a failure).
   * It automatically waits between poll attempts to avoid overwhelming
   * the API.
   *
   * @param guid - The verification GUID returned by the verify method
   * @param contractAddress - The address of the contract being verified
   * @param contractName - The name of the contract being verified
   * @returns An object containing:
   *   - `success`: true if verification succeeded, false if it failed
   *   - `message`: The status message from Etherscan
   *     (e.g., "Pass - Verified", "Fail - Unable to verify")
   *
   * @throws {HardhatError} CONTRACT_ALREADY_VERIFIED -
   *   If the contract was already verified
   * @throws {HardhatError} CONTRACT_VERIFICATION_STATUS_POLLING_FAILED -
   *   If the API returns an unexpected error
   * @throws {HardhatError} EXPLORER_REQUEST_FAILED -
   *   If the HTTP request fails
   */
  pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{ success: boolean; message: string }>;

  /**
   * Makes a custom API call to the Etherscan API with specified
   * parameters.
   *
   * This method is designed for advanced use cases where plugins need
   * to call Etherscan API endpoints that aren't covered by the standard
   * methods. It automatically handles authentication and chain
   * identification.
   *
   * @param params - The API call parameters as key-value pairs
   *   (e.g., `{ module: "contract", action: "getsourcecode",
   *   address: "0x..." }`)
   * @param options - Optional request options:
   *   - `method`: HTTP method to use ("GET" or "POST", defaults to
   *     "GET")
   *   - `body`: Request body for POST requests as key-value pairs
   *
   * @returns The raw response body from the Etherscan API containing:
   *   - `status`: "0" for error, "1" for success
   *   - `message`: Status message (e.g., "OK", "NOTOK")
   *   - `result`: Response data (type varies by endpoint - can be
   *     string, array, or object)
   *
   * @throws {HardhatError} EXPLORER_REQUEST_FAILED -
   *   If the HTTP request fails
   * @throws {HardhatError} EXPLORER_REQUEST_STATUS_CODE_ERROR -
   *   If the response status code is not 2xx
   *
   * @remarks
   * - The `apikey` and `chainid` parameters are automatically added
   *   to the query parameters. You can override these by explicitly
   *   passing them in the `params` object.
   * - This method returns the raw API response. Callers should check
   *   the `status` field and handle `result` appropriately.
   *
   * @example
   * ```typescript
   * const response = await verifier.etherscan.customApiCall({
   *   module: "contract",
   *   action: "getsourcecode",
   *   address: "0x1234..."
   * });
   *
   * if (response.status === "1") {
   *   console.log("Success:", response.result);
   * }
   * ```
   */
  customApiCall(
    params: Record<string, unknown>,
    options?: EtherscanCustomApiCallOptions,
  ): Promise<EtherscanResponseBody>;
}
