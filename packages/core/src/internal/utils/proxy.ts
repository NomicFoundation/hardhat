import { DependableFuture, ProxyFuture } from "../../types/future";

import { isProxy } from "./guards";

export function resolveProxyDependency(
  future: DependableFuture
): Exclude<DependableFuture, ProxyFuture> {
  if (isProxy(future)) {
    return resolveProxyDependency(future.proxy);
  }

  return future;
}

export function resolveProxyValue(
  future: DependableFuture
): Exclude<DependableFuture, ProxyFuture> {
  if (isProxy(future)) {
    return resolveProxyValue(future.value);
  }

  return future;
}
