import type { CallTrace, TestResult } from "@nomicfoundation/edr";

import { CallKind, TestStatus } from "@nomicfoundation/edr";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

export interface CallOptions {
  /** The contract's name; leave it out for a contract EDR couldn't identify. */
  contract?: string;
  /** The decoded function name. */
  fn?: string;
  gasUsed: number;
  children?: CallTrace[];
  kind?: CallKind;
  success?: boolean;
  isCheatcode?: boolean;
  address?: string;
  value?: bigint;
  /** Raw calldata, for a call EDR couldn't decode. */
  rawInputs?: Uint8Array;
}

export function createCall(options: CallOptions): CallTrace {
  return {
    kind: options.kind ?? CallKind.Call,
    success: options.success ?? true,
    isCheatcode: options.isCheatcode ?? false,
    gasUsed: BigInt(options.gasUsed),
    value: options.value ?? 0n,
    address: options.address ?? CONTRACT_ADDRESS,
    contract: options.contract,
    inputs: options.rawInputs ?? {
      name: options.fn ?? "fallback",
      arguments: [],
    },
    outputs: "",
    children: options.children ?? [],
  };
}

export function createCreate(
  contract: string | undefined,
  gasUsed: number,
  success = true,
): CallTrace {
  return createCall({
    contract,
    fn: "constructor",
    gasUsed,
    kind: CallKind.Create,
    success,
  });
}

export function createUnitTestResult(
  name: string,
  consumedGas: number,
  callTraces: CallTrace[],
  status: TestStatus = TestStatus.Success,
): TestResult {
  return {
    name,
    status,
    decodedLogs: [],
    durationNs: 0n,
    kind: { consumedGas: BigInt(consumedGas) },
    stackTrace: () => null,
    callTraces: () => callTraces,
    reason: undefined,
    counterexample: undefined,
    valueSnapshotGroups: undefined,
  };
}

export function createFuzzTestResult(name: string): TestResult {
  return {
    name,
    status: TestStatus.Success,
    decodedLogs: [],
    durationNs: 0n,
    kind: { runs: 256n, meanGas: 1n, medianGas: 1n },
    stackTrace: () => null,
    callTraces: () => [],
    reason: undefined,
    counterexample: undefined,
    valueSnapshotGroups: undefined,
  };
}

/** test_deposit from the measured project: a call that calls a token, and a refund. */
export function depositTestResult(): TestResult {
  const setUp = createCall({
    contract: "GasTest",
    fn: "setUp",
    gasUsed: 626_065,
    children: [createCreate("Token", 203_043)],
  });
  const test = createCall({
    contract: "GasTest",
    fn: "test_deposit",
    gasUsed: 44_194,
    children: [
      createCall({
        contract: "Vault",
        fn: "deposit",
        gasUsed: 37_071,
        children: [
          createCall({ contract: "Token", fn: "transfer", gasUsed: 6_634 }),
        ],
      }),
      createCall({
        contract: "Vault",
        fn: "shares",
        gasUsed: 801,
        kind: CallKind.StaticCall,
      }),
    ],
  });
  return createUnitTestResult("test_deposit()", 41_394, [setUp, test]);
}

/** test_swapManyTimes: the same router call five times, cold then warm. */
export function swapManyTimesTestResult(): TestResult {
  const swap = (transferFrom: number, poolSwap: number, gasUsed: number) =>
    createCall({
      contract: "Router",
      fn: "swapExact",
      gasUsed,
      children: [
        createCall({
          contract: "Pool",
          fn: "token0",
          gasUsed: 548,
          kind: CallKind.StaticCall,
        }),
        createCall({
          contract: "ERC20",
          fn: "transferFrom",
          gasUsed: transferFrom,
        }),
        createCall({ contract: "Pool", fn: "swap", gasUsed: poolSwap }),
      ],
    });
  const warm = () => swap(2_661, 10_065, 17_934);
  const test = createCall({
    contract: "DexTest",
    fn: "test_swapManyTimes",
    gasUsed: 168_208,
    children: [swap(17_061, 53_365, 80_634), warm(), warm(), warm(), warm()],
  });
  return createUnitTestResult("test_swapManyTimes()", 168_208, [test]);
}

/**
 * A test that calls `Rec.down(depth)`, which calls itself until it reaches 0.
 * Each call uses 100 gas of its own.
 */
export function recursionTestResult(depth: number): TestResult {
  let call = createCall({ contract: "Rec", fn: "down", gasUsed: 100 });
  for (let i = 1; i <= depth; i++) {
    call = createCall({
      contract: "Rec",
      fn: "down",
      gasUsed: 100 * (i + 1),
      children: [call],
    });
  }
  const gas = 100 * (depth + 1) + 50;
  const test = createCall({
    contract: "T",
    fn: "test_recursion",
    gasUsed: gas,
    children: [call],
  });
  return createUnitTestResult("test_recursion()", gas, [test]);
}
