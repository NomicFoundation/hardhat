import {
  Future,
  FutureType,
  IgnitionModule,
} from "../../../src/new-api/types/module";

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

interface BaseFuture {
  id: string;
  type: FutureType;
  module: IgnitionModule;
  dependencies: Set<Future>;
}

function _testThatEveryFutureIsBaseFuture(f: Future): BaseFuture {
  return f;
}

function _testThatBaseFutureIncludesAllSharedFieldsExceptType(
  f: Omit<BaseFuture, "type">
): UnionToIntersection<Omit<Future, "type">> {
  return f;
}

function _testThatEveryFutureTypeIsUsed(type: FutureType): Future["type"] {
  return type;
}
