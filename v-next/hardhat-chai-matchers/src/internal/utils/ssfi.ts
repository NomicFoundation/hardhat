import type { buildAssert } from "./build-assert.js";

// just a generic function type to avoid errors from the ban-types eslint rule
export type Ssfi = (...args: any[]) => any;

export type AssertWithSsfi = ReturnType<typeof buildAssert>;
