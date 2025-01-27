/* eslint-disable import/no-unused-modules */
import {
  Future,
  FutureType,
  IgnitionModule,
  RuntimeValue,
  RuntimeValueType,
} from "../../src/types/module";

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

interface BaseFuture {
  id: string;
  type: FutureType;
  module: IgnitionModule;
  dependencies: Set<Future | IgnitionModule>;
}

interface BaseRuntimeValue {
  type: RuntimeValueType;
}

function _testThatTheValuesOfFutureTypeMatchTheKeys<ValueT extends FutureType>(
  type: ValueT,
): FutureType {
  return FutureType[type];
}

function _testThatEveryFutureIsBaseFuture(f: Future): BaseFuture {
  return f;
}

function _testThatBaseFutureIncludesAllSharedFieldsExceptType(
  f: Omit<BaseFuture, "type">,
): UnionToIntersection<Omit<Future, "type">> {
  return f;
}

function _testThatEveryFutureTypeIsUsed(type: FutureType): Future["type"] {
  return type;
}

function _testThatEveryRuntimeValueIsBaseRuntimeValue(
  r: RuntimeValue,
): BaseRuntimeValue {
  return r;
}

function _testThatBaseRuntimeValueIncludesAllSharedFieldsExceptType(
  r: Omit<BaseRuntimeValue, "type">,
): UnionToIntersection<Omit<RuntimeValue, "type">> {
  return r;
}

function _testThatEveryRuntimeValueTypeIsUsed(
  type: RuntimeValueType,
): RuntimeValue["type"] {
  return type;
}

function _testThatTheValuesOfRuntimeValueTypeMatchTheKeys<
  ValueT extends RuntimeValueType,
>(type: ValueT): RuntimeValueType {
  return RuntimeValueType[type];
}
