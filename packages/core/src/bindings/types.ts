import { Contract, Tx } from "../types";

export type BindingOutput = string | number | Contract | Tx;

export function serializeBindingOutput(x: BindingOutput) {
  if (typeof x === "string") {
    return { _kind: "string" as const, value: x };
  } else if (typeof x === "number") {
    return { _kind: "number" as const, value: x };
  } else if ("address" in x) {
    return { _kind: "contract" as const, value: x };
  } else if ("hash" in x) {
    return { _kind: "tx" as const, value: x };
  }

  const exhaustiveCheck: never = x;
  return exhaustiveCheck;
}

export function deserializeBindingOutput(x: any) {
  if (x === null || x === undefined) {
    throw new Error("[deserializeBindingOutput] value is null or undefined");
  }

  if (!("_kind" in x)) {
    throw new Error(
      "[deserializeBindingOutput] value was not serialized by Ignition"
    );
  }

  return x.value;
}

export type ModuleResult = Record<string, BindingOutput>;
export type SerializedModuleResult = Record<string, SerializedBindingResult>;
export type SerializedBindingResult = ReturnType<typeof serializeBindingOutput>;

export type SerializedDeploymentResult = Record<string, SerializedModuleResult>;

export abstract class Binding<I = unknown, O extends BindingOutput = any> {
  // dummy variables needed by the type-checker to work correctly when opaque
  // types are used in a module definition
  protected _dummyInput!: I;
  protected _dummyOutput!: O;
}

export abstract class InternalBinding<
  I = unknown,
  O extends BindingOutput = any
> extends Binding<I, O> {
  constructor(
    public readonly moduleId: string,
    public readonly id: string,
    public readonly input: I
  ) {
    super();
  }

  abstract getDependencies(): InternalBinding[];

  public static isBinding(x: unknown): x is InternalBinding {
    return x instanceof InternalBinding;
  }
}

export interface ContractOptions {
  contractName: string;
  args: Array<Bindable<any>>;
}

export interface CallOptions {
  contract: ContractBinding;
  method: string;
  args: Array<Bindable<any>>;
}

export type Bindable<T extends BindingOutput> = T | Binding<unknown, T>;

export type AddressLike = Bindable<string> | Binding<any, Contract>;

export class ContractBinding extends Binding<ContractOptions, Contract> {}
export class CallBinding extends Binding<CallOptions, Tx> {}

export type Unflattened<T> = T[] | Array<Unflattened<T>>;

export type Resolved<T> = T extends Binding<any, infer O>
  ? O
  : {
      [K in keyof T]: T[K] extends Binding<any, infer O> ? O : Resolved<T[K]>;
    };
