import {
  CallableFuture,
  ContractCall,
  DependableFuture,
  Virtual,
  EventFuture,
} from "types/future";

import { isProxy } from "./guards";

export function resolveProxyDependency(
  future: DependableFuture
): CallableFuture | ContractCall | Virtual | EventFuture {
  if (isProxy(future)) {
    return resolveProxyDependency(future.proxy);
  }

  return future;
}

export function resolveProxyValue(
  future: DependableFuture
): CallableFuture | ContractCall | Virtual | EventFuture {
  if (isProxy(future)) {
    return resolveProxyValue(future.value);
  }

  return future;
}
