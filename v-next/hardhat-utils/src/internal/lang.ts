import type rfdcT from "rfdc";

let clone: ReturnType<typeof rfdcT> | null = null;
export async function getDeepCloneFunction(): Promise<<T>(input: T) => T> {
  const { default: rfdc } = await import("rfdc");

  if (clone === null) {
    clone = rfdc();
  }

  return clone;
}
