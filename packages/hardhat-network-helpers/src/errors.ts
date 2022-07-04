import { CustomError } from "hardhat/common";

export class HardhatNetworkHelpersError extends CustomError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidSnapshotError extends CustomError {
  constructor() {
    super("Trying to restore an invalid snapshot.");
  }
}

export class FixtureSnapshotError extends CustomError {
  constructor(parent: InvalidSnapshotError) {
    super(
      `There was an error reverting the snapshot of the fixture.

This might be caused by using nested loadFixture calls in a test, for example by using multiple beforeEach calls. This is not supported yet.`,
      parent
    );
  }
}

export class OnlyHardhatNetworkError extends CustomError {
  constructor(networkName: string, version?: string) {
    let errorMessage: string = ``;
    if (version === undefined) {
      errorMessage = `This helper can only be used with Hardhat Network. You are connected to '${networkName}'.`;
    } else {
      errorMessage = `This helper can only be used with Hardhat Network. You are connected to '${networkName}', whose identifier is '${version}'`;
    }

    super(errorMessage);
  }
}
