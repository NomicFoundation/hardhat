// ./ignition/CompleteModule.js
const { defineModule } = require("@ignored/hardhat-ignition");

const withLibArtifact = require("../libArtifacts/ContractWithLibrary.json");
const libArtifact = require("../libArtifacts/BasicLibrary.json");

module.exports = defineModule("CompleteModule", (m) => {
  const basic = m.contract("BasicContract");
  const library = m.library("BasicLibrary");
  const libFromArtifact = m.libraryFromArtifact("BasicLibrary", libArtifact, {
    id: "BasicLibrary2",
  });
  const withLib = m.contractFromArtifact(
    "ContractWithLibrary",
    withLibArtifact,
    [],
    {
      libraries: { BasicLibrary: library },
    }
  );

  // const call = m.call(basic, "basicFunction", [40]);
  // const eventArg = m.readEventArgument(call, "BasicEvent", "eventArg");
  // m.staticCall(withLib, "readonlyFunction", [eventArg]);

  // const duplicate = m.contractAt("BasicContract", basic);
  // const duplicateWithLib = m.contractAtFromArtifact(
  //   "ContractWithLibrary",
  //   withLib,
  //   withLibArtifact
  // );

  // m.send("test-send", duplicate, 123n);

  return {
    basic,
    library,
    libFromArtifact,
    withLib,
    // duplicate,
    // duplicateWithLib,
  };
});
