import { getClosestCallerPackage } from "../../../../src/internal/util/caller-package";
import {
  call as callFromTop,
  callFromNestedModule as topCallFromNestedModule,
} from "../top-caller-package-tester";

export function call() {
  return getClosestCallerPackage();
}

export function callFromNestedModule() {
  return call();
}

export function callFromTopModule() {
  return callFromTop();
}

export function indirectlyCallFromNestedpModule() {
  return topCallFromNestedModule();
}
