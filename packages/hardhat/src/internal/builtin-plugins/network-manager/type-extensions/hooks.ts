import type {
  ChainType,
  NetworkConnection,
  TransactionSigner,
} from "../../../../types/network.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";
import type { CoverageData } from "../../coverage/types.js";
import type { GasMeasurement } from "../../gas-analytics/types.js";

declare module "../../../../types/hooks.js" {
  export interface HardhatHooks {
    network: NetworkHooks;
  }

  export interface NetworkHooks {
    newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ): Promise<NetworkConnection<ChainTypeT>>;

    closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void>;

    onRequest<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse>,
    ): Promise<JsonRpcResponse>;

    /**
     * Provide a handler for this hook to sign the transactions of an account
     * whose key Hardhat doesn't hold.
     *
     * Hardhat calls this hook for every `eth_sendTransaction` request whose
     * `from` is a valid address, on every network, after it has filled the
     * gas and the fees, and before it uses its local accounts. If a handler
     * returns a signer, Hardhat fills the nonce and the chain id, asks the
     * signer to sign the transaction, checks the signature, and sends the
     * transaction with `eth_sendRawTransaction`. Otherwise, the
     * request continues as it would without this hook.
     *
     * A handler that doesn't sign for `from` should call `next`.
     *
     * @param context The hook context.
     * @param networkConnection The network connection the request is sent on.
     * @param from The sender, as a lowercase `0x`-prefixed address.
     * @param next A function to call the next handler for this hook.
     * @returns A signer for `from`, or `undefined` if no plugin signs for it.
     */
    resolveTransactionSigner<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      from: string,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextFrom: string,
      ) => Promise<TransactionSigner | undefined>,
    ): Promise<TransactionSigner | undefined>;

    /**
     * Hook triggered when the coverage data is received from EDR.
     *
     * @param context The hook context.
     * @param coverageData The coverage data.
     */
    onCoverageData(
      context: HookContext,
      coverageData: CoverageData,
    ): Promise<void>;

    /**
     * Hook triggered when the gas data is received from EDR.
     *
     * @param context The hook context.
     * @param gasMeasurement The gas measurement.
     */
    onGasMeasurement(
      context: HookContext,
      gasMeasurement: GasMeasurement,
    ): void;
  }
}
