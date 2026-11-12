import type { OpenCommand } from "../../src/internal/utils/open.js";

import { assert } from "chai";

import { getOpenCommand } from "../../src/internal/utils/open.js";

describe("getOpenCommand", function () {
  it("should quote a Windows path without spaces", function () {
    const filePath = "C:\\R&D\\project\\cache\\visualization\\index.html";

    assert.deepEqual(getOpenCommand("win32", filePath).args, [
      "/d",
      "/s",
      "/c",
      `"start "" "${filePath}""`,
    ]);
  });

  it("should pass shell metacharacters through on macOS and Linux", function () {
    const filePath = '/home/john/a "quoted" $(dir)/`x`/index.html';

    assert.deepEqual(getOpenCommand("linux", filePath), {
      file: "xdg-open",
      args: [filePath],
    });
  });

  describe("paths containing spaces", function () {
    const cases: Array<[NodeJS.Platform, string, OpenCommand]> = [
      [
        "win32",
        "C:\\Users\\John Doe\\project\\cache\\visualization\\index.html",
        {
          file: "cmd",
          args: [
            "/d",
            "/s",
            "/c",
            '"start "" "C:\\Users\\John Doe\\project\\cache\\visualization\\index.html""',
          ],
          windowsVerbatimArguments: true,
        },
      ],
      [
        "darwin",
        "/Users/john/My Projects/project/cache/visualization/index.html",
        {
          file: "open",
          args: [
            "/Users/john/My Projects/project/cache/visualization/index.html",
          ],
        },
      ],
      [
        "linux",
        "/home/john/My Projects/project/cache/visualization/index.html",
        {
          file: "xdg-open",
          args: [
            "/home/john/My Projects/project/cache/visualization/index.html",
          ],
        },
      ],
    ];

    for (const [platform, filePath, expected] of cases) {
      it(`should open a path with spaces on ${platform}`, function () {
        assert.deepEqual(getOpenCommand(platform, filePath), expected);
      });
    }
  });
});
