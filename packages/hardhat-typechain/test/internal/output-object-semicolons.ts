import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { removeOutputObjectSemicolons } from "../../src/internal/generate-types.js";

describe("removeOutputObjectSemicolons", () => {
  it("should remove the semicolon after the 'OutputObject' interface", () => {
    const output = removeOutputObjectSemicolons(`
    export namespace OperationEvent {
      export type InputTuple = [op: string, a: BigNumberish];
      export type OutputTuple = [op: string, a: bigint];
      export interface OutputObject {op: string, a: bigint };
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
    }`);

    assert.equal(
      output,
      `
    export namespace OperationEvent {
      export type InputTuple = [op: string, a: BigNumberish];
      export type OutputTuple = [op: string, a: bigint];
      export interface OutputObject {op: string, a: bigint }
      export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>
    }`,
    );
  });

  it("should remove the semicolon after an empty 'OutputObject' interface", () => {
    const output = removeOutputObjectSemicolons(`
      export interface OutputObject {};`);

    assert.equal(
      output,
      `
      export interface OutputObject {}`,
    );
  });

  it("should only remove the last semicolon when the interface has nested object types", () => {
    const output = removeOutputObjectSemicolons(`
      export interface OutputObject {s: [a: bigint] & {a: bigint}; b: string };`);

    assert.equal(
      output,
      `
      export interface OutputObject {s: [a: bigint] & {a: bigint}; b: string }`,
    );
  });

  it("should remove the semicolon from every 'OutputObject' interface in the content", () => {
    const output = removeOutputObjectSemicolons(`
      export interface OutputObject {a: bigint };
      export interface OutputObject {b: string };`);

    assert.equal(
      output,
      `
      export interface OutputObject {a: bigint }
      export interface OutputObject {b: string }`,
    );
  });

  it("should not modify other lines", () => {
    const input = `
      export type InputTuple = [by: BigNumberish];
      export interface Other {a: bigint };
      const OutputObject = {};
      export interface OutputObjectWithSuffix {a: bigint };
`;

    assert.equal(removeOutputObjectSemicolons(input), input);
  });

  it("should not modify content that was already processed", () => {
    const processed = removeOutputObjectSemicolons(`
      export interface OutputObject {a: bigint };`);

    assert.equal(removeOutputObjectSemicolons(processed), processed);
  });
});
