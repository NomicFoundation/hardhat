import type {
  Abi,
  AbiItemArgs,
  AbiItemName,
  ContractErrorArgs,
  ContractErrorName,
  ContractEventName,
} from "viem";

/**
 * Loose contract shape the assertion helpers infer the ABI from. Lighter than
 * viem's `GetContractReturnType<TAbi>` so inference still works on
 * errors-only or events-only contracts.
 */
export interface AbiHolder<TAbi extends Abi> {
  readonly abi: TAbi;
  readonly address: `0x${string}`;
}

/** Allow a `(value) => boolean` predicate at each tuple position. */
type WithPredicates<TArgs> = TArgs extends readonly unknown[]
  ? number extends TArgs["length"]
    ? unknown[]
    : {
        -readonly [K in keyof TArgs]: TArgs[K] | ((value: TArgs[K]) => boolean);
      }
  : unknown[];

/**
 * Args tuple for `TEventName` on `TAbi`, with predicates allowed per position.
 *
 * Uses viem's `AbiItemArgs` (tuple form, same kind viem uses for
 * `ContractFunctionArgs`) instead of `ContractEventArgs`, which returns the
 * named-object form for events whose params all have names.
 */
export type EventArgsOf<
  TAbi extends Abi,
  TEventName extends ContractEventName<TAbi>,
> =
  TEventName extends AbiItemName<TAbi>
    ? WithPredicates<AbiItemArgs<TAbi, TEventName>>
    : unknown[];

/** Args tuple for `TErrorName` on `TAbi`, with predicates allowed per position. */
export type ErrorArgsOf<
  TAbi extends Abi,
  TErrorName extends ContractErrorName<TAbi>,
> = WithPredicates<ContractErrorArgs<TAbi, TErrorName>>;
