import type { EVMResult, Message } from "@nomicfoundation/ethereumjs-evm";
import type { Address } from "@nomicfoundation/ethereumjs-util";

export interface MinimalInterpreterStep {
  pc: number;
  depth: number;
  opcode: {
    name: string;
  };
  stack: bigint[];
}

declare function onEvent(
  event: "step",
  cb: (step: MinimalInterpreterStep, next: any) => Promise<void>
): void;
declare function onEvent(
  event: "beforeMessage",
  cb: (step: Message, next: any) => Promise<void>
): void;
declare function onEvent(
  event: "afterMessage",
  cb: (step: EVMResult, next: any) => Promise<void>
): void;

/**
 * Used by the node to keep the `_vm` variable used by some plugins. This
 * interface only has the things used by those plugins.
 */
export interface MinimalEthereumJsVm {
  evm: {
    events: {
      on: typeof onEvent;
    };
  };
  stateManager: {
    putContractCode: (address: Address, code: Buffer) => Promise<void>;
    getContractStorage: (address: Address, slotHash: Buffer) => Promise<Buffer>;
    putContractStorage: (
      address: Address,
      slotHash: Buffer,
      slotValue: Buffer
    ) => Promise<void>;
  };
}

/**
 * Creates a proxy for the given object that throws if a property is accessed
 * that is not in the original object. It also works for nested objects.
 */
// function createVmProxy<T extends object>(obj: T, prefix?: string): T {
//   if (typeof obj !== "object" || obj === null) {
//     return obj;
//   }

//   return new Proxy(obj, {
//     get(target, prop): any {
//       if (prop in target) {
//         return createVmProxy(
//           (target as any)[prop],
//           `${prefix ?? ""}${String(prop)}.`
//         );
//       }

//       assertHardhatInvariant(
//         false,
//         `Property ${prefix ?? ""}${String(prop)} cannot be used in node._vm`
//       );
//     },

//     set() {
//       assertHardhatInvariant(false, "Properties cannot be changed in node._vm");
//     },
//   });
// }

// TODO: https://github.com/NomicFoundation/edr/issues/48
// Adapt this to EdrProviderWrapper
// export function getMinimalEthereumJsVm(
//   context: EthContextAdapter
// ): MinimalEthereumJsVm {
//   const minimalEthereumJsVm: MinimalEthereumJsVm = {
//     evm: {
//       events: {
//         on: (event, cb) => {
//           assertHardhatInvariant(
//             event === "step" ||
//               event === "beforeMessage" ||
//               event === "afterMessage",
//             `Event ${event} is not supported in node._vm`
//           );

//           if (event === "step") {
//             context.vm().onStep(cb as any);
//             context.blockMiner().onStep(cb as any);
//           } else if (event === "beforeMessage") {
//             context.vm().onBeforeMessage(cb as any);
//             context.blockMiner().onBeforeMessage(cb as any);
//           } else if (event === "afterMessage") {
//             context.vm().onAfterMessage(cb as any);
//             context.blockMiner().onAfterMessage(cb as any);
//           }
//         },
//       },
//     },
//     stateManager: {
//       putContractCode: async (address, code) => {
//         return context.vm().putContractCode(address, code, true);
//       },
//       getContractStorage: async (address, slotHash) => {
//         return context.vm().getContractStorage(address, slotHash);
//       },
//       putContractStorage: async (address, slotHash, slotValue) => {
//         return context
//           .vm()
//           .putContractStorage(address, slotHash, slotValue, true);
//       },
//     },
//   };

//   return createVmProxy(minimalEthereumJsVm);
// }
