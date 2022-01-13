import { EIP1193Provider, RequestArguments } from "../../../types";
import { ProviderWrapper } from "./wrapper";
export declare const GANACHE_GAS_MULTIPLIER = 5;
export declare class FixedGasProvider extends ProviderWrapper {
    private readonly _gasLimit;
    constructor(provider: EIP1193Provider, _gasLimit: number);
    request(args: RequestArguments): Promise<unknown>;
}
export declare class FixedGasPriceProvider extends ProviderWrapper {
    private readonly _gasPrice;
    constructor(provider: EIP1193Provider, _gasPrice: number);
    request(args: RequestArguments): Promise<unknown>;
}
declare abstract class MultipliedGasEstimationProvider extends ProviderWrapper {
    private readonly _gasMultiplier;
    private _blockGasLimit;
    constructor(provider: EIP1193Provider, _gasMultiplier: number);
    protected _getMultipliedGasEstimation(params: any[]): Promise<string>;
    private _getBlockGasLimit;
}
export declare class AutomaticGasProvider extends MultipliedGasEstimationProvider {
    constructor(provider: EIP1193Provider, gasMultiplier?: number);
    request(args: RequestArguments): Promise<unknown>;
}
export declare class AutomaticGasPriceProvider extends ProviderWrapper {
    static readonly EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE: number;
    static readonly EIP1559_REWARD_PERCENTILE: number;
    private _nodeHasFeeHistory?;
    private _nodeSupportsEIP1559?;
    request(args: RequestArguments): Promise<unknown>;
    private _getGasPrice;
    private _suggestEip1559FeePriceValues;
}
/**
 * This provider multiplies whatever gas estimation Ganache gives by [[GANACHE_GAS_MULTIPLIER]]
 *
 * NOTE: This bug was present at least in Ganache 6.4.x.
 * One way to test if the bug is still present is to check if the estimation to
 * run a deployment transaction with this data is high enough:
 *  * 0x608060405234801561001057600080fd5b5060405161043e38038061043e8339810180604052602081101561003357600080fd5b81019080805164010000000081111561004b57600080fd5b8281019050602081018481111561006157600080fd5b815185600182028301116401000000008211171561007e57600080fd5b50509291905050506040516100929061010b565b604051809103906000f0801580156100ae573d6000803e3d6000fd5b506000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508060019080519060200190610104929190610117565b50506101bc565b6088806103b683390190565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015857805160ff1916838001178555610186565b82800160010185558215610186579182015b8281111561018557825182559160200191906001019061016a565b5b5090506101939190610197565b5090565b6101b991905b808211156101b557600081600090555060010161019d565b5090565b90565b6101eb806101cb6000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063f86cc00914610030575b600080fd5b61003861003a565b005b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166319ff1d216040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156100a357600080fd5b505af11580156100b7573d6000803e3d6000fd5b505050506000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166319ff1d216040518163ffffffff1660e01b8152600401600060405180830381600087803b15801561012457600080fd5b505af1158015610138573d6000803e3d6000fd5b505050506000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166319ff1d216040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156101a557600080fd5b505af11580156101b9573d6000803e3d6000fd5b5050505056fea165627a7a723058203691efa02f6279a7b7eea9265988d2deaf417c2590c3103779c96b68e78463b700296080604052348015600f57600080fd5b50606b80601d6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c806319ff1d2114602d575b600080fd5b60336035565b005b600560008190555056fea165627a7a72305820a00cf00e60c019ed83e0857faef9e9383880a5addd91429d30203771c82a4014002900000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000
 */
export declare class GanacheGasMultiplierProvider extends MultipliedGasEstimationProvider {
    private _cachedIsGanache;
    constructor(provider: EIP1193Provider);
    request(args: RequestArguments): Promise<unknown>;
    private _isGanache;
}
export {};
//# sourceMappingURL=gas-providers.d.ts.map