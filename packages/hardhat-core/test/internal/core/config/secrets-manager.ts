import { expect } from "chai";
import sinon from "sinon";
import { getSecret } from "../../../../src/internal/core/config/config-env";
import { SecretsManager } from "../../../../src/internal/core/secrets/secrets-manager";

const spyFunctionSecretManagerGet = sinon.stub(SecretsManager.prototype, "get");

describe("SecretsManager", function () {
  describe("getSecret", function () {
    it("should return the value associated to the key", function () {
      spyFunctionSecretManagerGet.returns("secret1");
      expect(getSecret("key1")).to.equal("secret1");
    });

    it("should return the default value for the secret because the key is not found", function () {
      spyFunctionSecretManagerGet.returns(undefined);

      expect(getSecret("non-existing", "defaultValue1")).to.equal(
        "defaultValue1"
      );
    });

    it("should throw an error if the key does not exist and no default value is set", function () {
      spyFunctionSecretManagerGet.returns(undefined);

      expect(() => getSecret("non-existing")).to.throw(
        "HH317: Cannot find a value associated to the key 'non-existing'"
      );
    });
  });
});
