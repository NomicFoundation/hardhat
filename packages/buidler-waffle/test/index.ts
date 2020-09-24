import { HARDHAT_NETWORK_NAME } from "@nomiclabs/buidler/plugins";
import { ResolvedHardhatNetworkConfig } from "@nomiclabs/buidler/types";
import { assert } from "chai";
import path from "path";

import { useEnvironment } from "./helpers";

describe("Waffle plugin plugin", function () {
  describe("Buidler's Waffle provider adapter", function () {
    describe("provider.getWallets", function () {
      describe("With hardhat", function () {
        describe("With the default hardhat accounts", function () {
          useEnvironment(path.join(__dirname, "buidler-project"));

          it("Should return a wallet for each of the default accounts", function () {
            const wallets = this.env.waffle.provider.getWallets();
            assert.equal(this.env.network.name, HARDHAT_NETWORK_NAME);
            const accounts = (this.env.network
              .config as ResolvedHardhatNetworkConfig).accounts;
            assert.lengthOf(wallets, accounts.length);

            for (let i = 0; i < wallets.length; i++) {
              assert.equal(
                wallets[i].privateKey.toLowerCase(),
                accounts[i].privateKey.toLowerCase()
              );
            }
          });
        });

        describe("With customized hardhat accounts", function () {
          useEnvironment(
            path.join(__dirname, "buidler-project-custom-accounts")
          );

          it("Should return a wallet for each of the custom accounts", function () {
            const wallets = this.env.waffle.provider.getWallets();
            const accounts = require(path.join(
              __dirname,
              "buidler-project-custom-accounts",
              "buidler.config.js"
            )).networks.hardhat.accounts;

            assert.lengthOf(wallets, accounts.length);

            for (let i = 0; i < wallets.length; i++) {
              assert.equal(
                wallets[i].privateKey.toLowerCase(),
                accounts[i].privateKey.toLowerCase()
              );
            }
          });
        });
      });

      describe("Using other network", function () {
        useEnvironment(path.join(__dirname, "buidler-project"), "localhost");

        it("Should throw an error", function () {
          assert.throws(
            () => this.env.waffle.provider.getWallets(),
            "This method only works with Buidler EVM"
          );
        });
      });

      describe("Deprecated getWallets", function () {
        describe("With hardhat", function () {
          describe("With the default hardhat accounts", function () {
            useEnvironment(path.join(__dirname, "buidler-project"));

            it("Should return a wallet for each of the default accounts", function () {
              const wallets = this.env.waffle.provider.getWallets();
              assert.equal(this.env.network.name, HARDHAT_NETWORK_NAME);
              const accounts = (this.env.network
                .config as ResolvedHardhatNetworkConfig).accounts!;

              assert.lengthOf(wallets, accounts.length);

              for (let i = 0; i < wallets.length; i++) {
                assert.equal(
                  wallets[i].privateKey.toLowerCase(),
                  accounts[i].privateKey.toLowerCase()
                );
              }
            });
          });
        });
      });
    });
  });

  describe("Test environment initialization", function () {
    useEnvironment(path.join(__dirname, "buidler-project"));

    it("Should load the Waffle chai matchers", async function () {
      await this.env.run("test", { testFiles: [] });
      assert.equal(process.exitCode, 1);
      process.exitCode = 0;
    });
  });
});
