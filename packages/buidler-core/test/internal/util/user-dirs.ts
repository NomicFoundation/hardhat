import { assert } from "chai";
import { join } from "path";

import {
  getCacheDir,
  getConfigDir,
  getDataDir,
} from "../../../src/internal/util/user-dirs";
import userHomeDir from "../../../src/internal/util/user-home-dir";

describe("User directory functions", function () {
  let originalPlatform: string;

  function setMockPlatform(platform: string) {
    beforeEach(function () {
      // Mock the platform to "win32":
      originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: platform,
      });
    });
  }

  function restorePlatform() {
    afterEach(function () {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
      });
    });
  }

  describe("getCacheDir", function () {
    describe("on Windows", function () {
      setMockPlatform("win32");

      it("Should use $LOCALAPPDATA\\buidler\\Cache if $LOCALAPPDATA is set", function () {
        process.env.LOCALAPPDATA = "foo";
        assert.equal(getCacheDir(), join("foo", "buidler", "Cache"));
        delete process.env.LOCALAPPDATA;
      });

      it("Should use $HOME\\AppData\\Local\\buidler\\Cache otherwise", function () {
        assert.equal(
          getCacheDir(),
          join(userHomeDir, "AppData", "Local", "buidler", "Cache")
        );
      });

      restorePlatform();
    });

    describe("on Darwin (MacOS)", function () {
      setMockPlatform("darwin");

      it("should use $XDG_CACHE_HOME/buidler if XDG_CACHE_HOME is set", function () {
        process.env.XDG_CACHE_HOME = "foo";
        assert.equal(getCacheDir(), join("foo", "buidler"));
        delete process.env.XDG_CACHE_HOME;
      });

      it("should use $HOME/Library/Caches/buidler otherwise", function () {
        assert.equal(
          getCacheDir(),
          join(userHomeDir, "Library", "Caches", "buidler")
        );
      });

      restorePlatform();
    });

    describe("on Linux and others", function () {
      setMockPlatform("linux");

      it("should use $XDG_CACHE_HOME/buidler if XDG_CACHE_HOME is set", function () {
        process.env.XDG_CACHE_HOME = "foo";
        assert.equal(getCacheDir(), join("foo", "buidler"));
        delete process.env.XDG_CACHE_HOME;
      });

      it("should use $HOME/.cache/buidler otherwise", function () {
        assert.equal(getCacheDir(), join(userHomeDir, ".cache", "buidler"));
      });

      restorePlatform();
    });
  });

  describe("getDataDir", function () {
    describe("on Windows", function () {
      setMockPlatform("win32");

      it("Should use $LOCALAPPDATA\\buidler\\Data if $LOCALAPPDATA is set", function () {
        process.env.LOCALAPPDATA = "foo";
        assert.equal(getDataDir(), join("foo", "buidler", "Data"));
        delete process.env.LOCALAPPDATA;
      });

      it("Should use $HOME\\AppData\\Local\\buidler\\Data otherwise", function () {
        assert.equal(
          getDataDir(),
          join(userHomeDir, "AppData", "Local", "buidler", "Data")
        );
      });

      restorePlatform();
    });

    describe("on Darwin (MacOS)", function () {
      setMockPlatform("darwin");

      it("should use $XDG_DATA_HOME/buidler if XDG_DATA_HOME is set", function () {
        process.env.XDG_DATA_HOME = "foo";
        assert.equal(getDataDir(), join("foo", "buidler"));
        delete process.env.XDG_DATA_HOME;
      });

      it("should use $HOME/.local/share/buidler otherwise", function () {
        assert.equal(
          getDataDir(),
          join(userHomeDir, ".local", "share", "buidler")
        );
      });

      restorePlatform();
    });

    describe("on Linux and others", function () {
      setMockPlatform("linux");

      it("should use $XDG_DATA_HOME/buidler if XDG_DATA_HOME is set", function () {
        process.env.XDG_DATA_HOME = "foo";
        assert.equal(getDataDir(), join("foo", "buidler"));
        delete process.env.XDG_DATA_HOME;
      });

      it("should use $HOME/.cache/buidler otherwise", function () {
        assert.equal(
          getDataDir(),
          join(userHomeDir, ".local", "share", "buidler")
        );
      });

      restorePlatform();
    });
  });

  describe("getConfigDir", function () {
    describe("on Windows", function () {
      setMockPlatform("win32");

      it("Should use $LOCALAPPDATA\\buidler\\Config if $LOCALAPPDATA is set", function () {
        process.env.LOCALAPPDATA = "foo";
        assert.equal(getConfigDir(), join("foo", "buidler", "Config"));
        delete process.env.LOCALAPPDATA;
      });

      it("Should use $HOME\\AppData\\Local\\buidler\\Config otherwise", function () {
        assert.equal(
          getConfigDir(),
          join(userHomeDir, "AppData", "Local", "buidler", "Config")
        );
      });

      restorePlatform();
    });

    describe("on Darwin (MacOS)", function () {
      setMockPlatform("darwin");

      it("should use $XDG_CONFIG_HOME/buidler if XDG_CONFIG_HOME is set", function () {
        process.env.XDG_CONFIG_HOME = "foo";
        assert.equal(getConfigDir(), join("foo", "buidler"));
        delete process.env.XDG_CONFIG_HOME;
      });

      it("should use $HOME/.config/buidler otherwise", function () {
        assert.equal(getConfigDir(), join(userHomeDir, ".config", "buidler"));
      });

      restorePlatform();
    });

    describe("on Linux and others", function () {
      setMockPlatform("linux");

      it("should use $XDG_CONFIG_HOME/buidler if XDG_CONFIG_HOME is set", function () {
        process.env.XDG_CONFIG_HOME = "foo";
        assert.equal(getConfigDir(), join("foo", "buidler"));
        delete process.env.XDG_CONFIG_HOME;
      });

      it("should use $HOME/.config/buidler otherwise", function () {
        assert.equal(getConfigDir(), join(userHomeDir, ".config", "buidler"));
      });

      restorePlatform();
    });
  });
});
