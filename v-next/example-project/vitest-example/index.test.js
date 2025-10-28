import { expect, test } from "vitest";
import { numberClass } from "./index.js";

test("numberClass 1", () => {
  expect(numberClass(0)).toBe(0);

  // expect(numberClass(0)).toBe(0);

  expect(numberClass(3)).toBe(2);
});
