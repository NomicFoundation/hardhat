import {
  CallableFuture,
  ContractCall,
  DependableFuture,
  Virtual,
} from "types/future";

import { isProxy } from "./guards";

export function resolveProxyDependency(
  future: DependableFuture
): CallableFuture | ContractCall | Virtual {
  if (isProxy(future)) {
    return resolveProxyDependency(future.proxy);
  }

  return future;
}

export function resolveProxyValue(
  future: DependableFuture
): CallableFuture | ContractCall | Virtual {
  if (isProxy(future)) {
    return resolveProxyValue(future.value);
  }

  return future;
}
