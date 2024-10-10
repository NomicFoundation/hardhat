import type {
  EdrNetworkAccountsConfig,
  EdrNetworkConfig,
  HttpNetworkConfig,
} from "@ignored/hardhat-vnext/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateNetworkConfig } from "../../../../src/internal/builtin-plugins/network-manager/type-validation.js";

describe("HttpNetworkConfig", () => {
  describe("accounts", function () {
    const httpNetworkConfig: HttpNetworkConfig = {
      type: "http",
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      accounts: "remote", // Modified in the tests
      url: "http://localhost:8545",
      timeout: 20_000,
      httpHeaders: {},
    };

    it("Should allow the value 'remote'", function () {
      httpNetworkConfig.accounts = "remote";

      const validationErrors = validateNetworkConfig(httpNetworkConfig);

      assert.equal(validationErrors.length, 0);
    });

    it("Should allow an array of valid private keys", function () {
      httpNetworkConfig.accounts = [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      ];

      const validationErrors = validateNetworkConfig(httpNetworkConfig);

      assert.equal(validationErrors.length, 0);
    });

    it("Should allow an account with a valid HttpNetworkHDAccountsConfig", function () {
      httpNetworkConfig.accounts = {
        mnemonic: "asd asd asd",
        initialIndex: 0,
        count: 123,
        path: "m/123",
        passphrase: "passphrase",
      };

      const validationErrors = validateNetworkConfig(httpNetworkConfig);

      assert.equal(validationErrors.length, 0);
    });

    // TODO: still valid?
    // it("Should allow valid private keys with missing hex prefix", function () {
    //   httpNetworkConfig.accounts = [
    //     "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    //   ];

    //   const validationErrors = validateNetworkConfig(httpNetworkConfig);

    //   assert.equal(validationErrors.length, 0);
    // });

    it("Should not allow hex literals", function () {
      httpNetworkConfig.accounts = [
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- needed to force an hex literals
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa as any,
      ];

      const validationErrors = validateNetworkConfig(httpNetworkConfig);

      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "Expected 'remote', an array of strings, or an object with account details",
      );
    });

    it("Should not allow private keys of incorrect length", function () {
      httpNetworkConfig.accounts = ["0xaaaa"];

      let validationErrors = validateNetworkConfig(httpNetworkConfig);
      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "The private key must be a valid private key",
      );

      httpNetworkConfig.accounts = [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb",
      ];

      validationErrors = validateNetworkConfig(httpNetworkConfig);
      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "The private key must be a valid private key",
      );
    });

    it("Should not allow invalid private keys", function () {
      httpNetworkConfig.accounts = [
        "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
      ];

      const validationErrors = validateNetworkConfig(httpNetworkConfig);

      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "The private key must be a valid private key",
      );
    });

    it("should fail with invalid types", () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the wrong type must be forced to trigger the test failure
      const accountsValuesToTest = [123, [{}], { asd: 123 }] as any;

      for (const accounts of accountsValuesToTest) {
        httpNetworkConfig.accounts = accounts;

        const validationErrors = validateNetworkConfig(httpNetworkConfig);

        assert.notEqual(validationErrors.length, 0);
        assert.equal(
          validationErrors[0].message,
          "Expected 'remote', an array of strings, or an object with account details",
        );
      }
    });

    it("should fail with invalid HttpNetworkHDAccountsConfig", () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the wrong type must be forced to trigger the test failure
      const accountsValuesToTest = [
        { mnemonic: 123 },
        { initialIndex: "asd" },
        { count: "asd" },
        { path: 123 },
        { type: 123 },
      ] as any;

      for (const accounts of accountsValuesToTest) {
        httpNetworkConfig.accounts = accounts;

        const validationErrors = validateNetworkConfig(httpNetworkConfig);

        assert.notEqual(validationErrors.length, 0);
        assert.equal(
          validationErrors[0].message,
          "Expected 'remote', an array of strings, or an object with account details",
        );
      }
    });
  });
});

describe("EdrNetworkConfig", function () {
  describe("accounts", function () {
    const edrNetworkConfig: EdrNetworkConfig = {
      type: "edr",
      chainId: 1,
      from: "",
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      accounts: [
        // Modified in the tests
        {
          privateKey: "",
          balance: "0x0",
        },
      ],
    };

    it("Should allow an array of account objects with valid private keys", function () {
      edrNetworkConfig.accounts = [
        {
          balance: "123",
          privateKey:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        {
          balance: "123",
          privateKey:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        {
          balance: "123",
          privateKey:
            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
      ];

      const validationErrors = validateNetworkConfig(edrNetworkConfig);

      assert.equal(validationErrors.length, 0);
    });

    it("Should allow an account with a valid EdrNetworkHDAccountsConfig", function () {
      edrNetworkConfig.accounts = {
        mnemonic: "asd asd asd",
        initialIndex: 0,
        count: 123,
        path: "m/1/2",
        accountsBalance: "123",
        passphrase: "passphrase",
      };

      const validationErrors = validateNetworkConfig(edrNetworkConfig);

      assert.equal(validationErrors.length, 0);
    });

    // TODO: still valid?
    // it("Should allow valid private keys with missing hex prefix", function () {
    //   edrNetworkConfig.accounts = [
    //     {
    //       balance: "123",
    //       privateKey:
    //         "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    //     },
    //   ];

    //   const validationErrors = validateNetworkConfig(edrNetworkConfig);

    //   assert.equal(validationErrors.length, 0);
    // });

    it("Should not allow an array that contains a value that is not an object", function () {
      edrNetworkConfig.accounts = [
        {
          balance: "123",
          privateKey:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the wrong type must be forced to trigger the test failure
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as any,
        {
          balance: "123",
          privateKey:
            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
      ];

      const validationErrors = validateNetworkConfig(edrNetworkConfig);

      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "Expected an array of objects with 'privateKey' and 'balance', or an object with mnemonic and account details",
      );
    });

    it("Should not allow hex literals", function () {
      edrNetworkConfig.accounts = [
        {
          balance: "123",
          privateKey:
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- needed to force an hex literals
            0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa as any,
        },
      ];

      const validationErrors = validateNetworkConfig(edrNetworkConfig);

      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "Expected an array of objects with 'privateKey' and 'balance', or an object with mnemonic and account details",
      );
    });

    it("Should not allow private keys of incorrect length", function () {
      edrNetworkConfig.accounts = [
        {
          balance: "123",
          privateKey: "0xaaaa",
        },
      ];

      let validationErrors = validateNetworkConfig(edrNetworkConfig);
      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "The private key must be a valid private key",
      );

      edrNetworkConfig.accounts = [
        {
          balance: "123",
          privateKey:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbb",
        },
      ];

      validationErrors = validateNetworkConfig(edrNetworkConfig);
      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "The private key must be a valid private key",
      );
    });

    it("Should not allow invalid private keys", function () {
      edrNetworkConfig.accounts = [
        {
          balance: "123",
          privateKey:
            "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
        },
      ];

      const validationErrors = validateNetworkConfig(edrNetworkConfig);

      assert.notEqual(validationErrors.length, 0);
      assert.equal(
        validationErrors[0].message,
        "The private key must be a valid private key",
      );
    });

    describe("it should fail with invalid types", () => {
      it("wrong type passed", () => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the wrong type must be forced to trigger the test failure
        const accountsValuesToTest = [
          123,
          [{}],
          [{ privateKey: "" }],
          [{ balance: "" }],
          [{ balance: 213 }],
          [{ privateKey: 123 }],
          [{ privateKey: "0xxxxx", balance: 213 }],
        ] as any;

        for (const accounts of accountsValuesToTest) {
          edrNetworkConfig.accounts = accounts;

          const validationErrors = validateNetworkConfig(edrNetworkConfig);

          assert.notEqual(validationErrors.length, 0);
          assert.equal(
            validationErrors[0].message,
            "Expected an array of objects with 'privateKey' and 'balance', or an object with mnemonic and account details",
          );
        }
      });

      it("private key errors", () => {
        const accountsValuesToTest: EdrNetworkAccountsConfig[] = [
          [{ privateKey: "0xxxxx", balance: "0.1231" }],
          [{ privateKey: "0xxxxx", balance: "001231" }],
          [{ privateKey: "0xxxxx", balance: ".02123" }],
          [{ privateKey: "0xxxxx", balance: "-123" }],
        ];

        for (const accounts of accountsValuesToTest) {
          edrNetworkConfig.accounts = accounts;

          const validationErrors = validateNetworkConfig(edrNetworkConfig);

          assert.notEqual(validationErrors.length, 0);
          assert.equal(
            validationErrors[0].message,
            "The private key must be a valid private key",
          );
        }
      });
    });

    it("should fail with invalid HttpNetworkHDAccountsConfig", () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the wrong type must be forced to trigger the test failure
      const accountsValuesToTest = [
        { mnemonic: 123 },
        { initialIndex: "asd" },
        { count: "asd" },
        { path: 123 },
        { type: 123 },
      ] as any;

      for (const accounts of accountsValuesToTest) {
        edrNetworkConfig.accounts = accounts;

        const validationErrors = validateNetworkConfig(edrNetworkConfig);

        assert.notEqual(validationErrors.length, 0);
        assert.equal(
          validationErrors[0].message,
          "Expected an array of objects with 'privateKey' and 'balance', or an object with mnemonic and account details",
        );
      }
    });
  });
});
