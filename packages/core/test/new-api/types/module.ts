import {
  Future,
  FutureType,
  IgnitionModule,
} from "../../../src/new-api/types/module";

interface BaseFuture {
  id: string;
  type: FutureType;
  module: IgnitionModule;
  dependencies: Set<Future>;
}

const _testThatEveryFutureIsBaseFuture: Future extends BaseFuture
  ? true
  : never = true;
