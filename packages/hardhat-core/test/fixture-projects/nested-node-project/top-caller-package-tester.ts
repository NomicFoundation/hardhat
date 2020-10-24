import { getClosestCallerPackage } from "../../../src/internal/util/caller-package";

import {
  call as callFromNested,
  callFromTopModule as nestedCallFromTopModule,
} from "./project/nested-caller-package-tester";

export function call() {
  return getClosestCallerPackage();
}

export function callFromNestedModule() {
  return callFromNested();
}

export function callFromTopModule() {
  return call();
}

export function indirectlyCallFromTopModule() {
  return nestedCallFromTopModule();
}
