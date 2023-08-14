describe("Libraries handling", () => {
  describe("validateLibraries", () => {
    it("Should throw if an invalid address is provided", async () => {
      // TODO @alcuadrado
    });

    it("Should throw if a library name is not recognized", async () => {
      // TODO @alcuadrado
    });

    it("Should throw if a library name is ambiguous", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a library is missing", () => {
      // TODO @alcuadrado
    });

    it("Should accept bare names if non-ambiguous", () => {
      // TODO @alcuadrado
    });

    it("Should accept fully qualified names", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a name is used twice, as FQN and bare name", () => {
      // TODO @alcuadrado
    });
  });

  describe("linkLibraries", () => {
    it("Should validate the libraries", () => {});

    it("Should link ambigous libraries correctly", () => {});

    it("Should link by FQN", () => {});

    it("Should link by bare name", () => {});
  });
});
