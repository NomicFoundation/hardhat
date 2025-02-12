import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";

use(chaiAsPromised);

afterEach(() => {
  sinon.restore();
});
