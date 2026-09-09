import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseKbField } from "./mem-sampler.ts";

const STATUS = `Name:\tnode
Umask:\t0022
State:\tS (sleeping)
VmPeak:\t   11476 kB
VmRSS:\t    5296 kB
VmHWM:\t    5872 kB
Threads:\t7
`;

describe("parseKbField", () => {
  it("reads a kB counter from /proc status content", () => {
    assert.equal(parseKbField(STATUS, "VmHWM"), 5872);
    assert.equal(parseKbField(STATUS, "VmRSS"), 5296);
  });

  it("returns undefined for a missing field (kernel threads, zombies)", () => {
    assert.equal(
      parseKbField("Name:\tkthreadd\nThreads:\t1\n", "VmHWM"),
      undefined,
    );
  });

  it("does not match a field name as a substring of another", () => {
    assert.equal(parseKbField(STATUS, "Vm"), undefined);
    assert.equal(parseKbField(STATUS, "HWM"), undefined);
  });
});
