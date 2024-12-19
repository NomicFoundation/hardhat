import { Future, IgnitionModule } from "../../types/module";

/**
 * Get the futures from a module, including its submodules.
 * No ordering is enforced.
 */
export function getFuturesFromModule(module: IgnitionModule): Future[] {
  return [...module.futures].concat(
    Array.from(module.submodules).flatMap((sub) => getFuturesFromModule(sub))
  );
}
