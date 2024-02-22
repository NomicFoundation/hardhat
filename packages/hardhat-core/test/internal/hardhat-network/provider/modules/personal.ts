import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

describe("Personal module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("personal_sign", async function () {
        it("Should be compatible with geth's implementation", async function () {
          // This test was created by using Geth 1.10.12-unstable and calling personal_sign
          const result = await this.provider.request({
            method: "personal_sign",
            params: [
              "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979",
              "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
            ],
          });

          assert.strictEqual(
            result,
            "0x9c73dd4937a37eecab3abb54b74b6ec8e500080431d36afedb1726624587ee6710296e10c1194dded7376f13ff03ef6c9e797eb86bae16c20c57776fc69344271c"
          );
        });

        it("Should be compatible with metamask's implementation", async function () {
          // This test was created by using Metamask 10.3.0

          const result = (await this.provider.request({
            method: "personal_sign",
            params: [
              "0x7699f568ecd7753e6ddf75a42fa4c2cc86cbbdc704c9eb1a6b6d4b9d8b8d1519",
              "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
            ],
          })) as string;

          assert.strictEqual(
            result,
            "0x2875e4206c9fe3b229291c81f95cc4f421e2f4d3e023f5b4041daa56ab4000977010b47a3c01036ec8a6a0872aec2ab285150f003d01b0d8da60c1cceb9154181c"
          );
        });
      });
    });
  });
});
