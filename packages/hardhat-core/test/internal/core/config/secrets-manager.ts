import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import { secrets } from "../../../../src/internal/core/config/config-env";
import { SecretsManager } from "../../../../src/internal/core/secrets/secrets-manager";

describe("SecretsManager", function () {
  let sandbox: SinonSandbox;
  let spyFunctionSecretManagerGet: any;

  before(() => {
    sandbox = sinon.createSandbox();
    spyFunctionSecretManagerGet = sandbox.stub(SecretsManager.prototype, "get");
  });

  after(() => {
    sandbox.restore();
  });

  describe("getSecret", function () {
    it("should return the value associated to the key", function () {
      spyFunctionSecretManagerGet.returns("secret1");
      expect(secrets.get("key1")).to.equal("secret1");
    });

    it("should return the default value for the secret because the key is not found", function () {
      spyFunctionSecretManagerGet.returns(undefined);

      expect(secrets.get("non-existing", "defaultValue1")).to.equal(
        "defaultValue1"
      );
    });

    it("should throw an error if the key does not exist and no default value is set", function () {
      spyFunctionSecretManagerGet.returns(undefined);

      expect(() => secrets.get("non-existing")).to.throw(
        "HH1201: Cannot find a secret value associated to the key 'non-existing'"
      );
    });
  });
});
