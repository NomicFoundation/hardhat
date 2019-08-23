import path from "path";

import { useEnvironment } from "./helpers";

describe("Ganache plugin", function() {
  useEnvironment(path.join(__dirname, "buidler-project"));

  it("Run test", function() {
    this.env.run("test");
  });
});
