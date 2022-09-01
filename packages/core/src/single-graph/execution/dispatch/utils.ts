import { ArgValue } from "../../types/executionGraph";
import { isDependable } from "../../utils/guards";

export function toAddress(v: any) {
  if (typeof v === "object" && "address" in v) {
    return v.address;
  }

  return v;
}

export function resolveFrom(context: Map<number, any>) {
  return (arg: ArgValue) => {
    if (!isDependable(arg)) {
      return arg;
    }

    const entry = context.get(arg.vertexId);

    if (!entry) {
      throw new Error(`No context entry for ${arg.vertexId} (${arg.label})`);
    }

    return entry;
  };
}
