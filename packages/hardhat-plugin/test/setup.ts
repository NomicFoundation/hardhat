/* eslint-disable import/no-unused-modules */
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";

chai.use(chaiAsPromised);

afterEach(() => {
  sinon.restore();
});
