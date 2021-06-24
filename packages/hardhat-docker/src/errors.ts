// For an explanation about these classes constructors go to:
// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work

import { Image } from "./types";

export class HardhatDockerError extends Error {
  constructor(public readonly parent?: Error) {
    super();
    Object.setPrototypeOf(this, HardhatDockerError.prototype);
  }
}

export class DockerHubConnectionError extends HardhatDockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerHubConnectionError.prototype);
  }
}

export class DockerNotInstalledError extends HardhatDockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerNotInstalledError.prototype);
  }
}

export class DockerNotRunningError extends HardhatDockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerNotRunningError.prototype);
  }
}

export class DockerBadGatewayError extends HardhatDockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerBadGatewayError.prototype);
  }
}

export class ImageDoesntExistError extends HardhatDockerError {
  constructor(public readonly image: Image, public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, ImageDoesntExistError.prototype);
  }
}

export class BindDoesntExistInHostError extends HardhatDockerError {
  constructor(public readonly path: string) {
    super();

    Object.setPrototypeOf(this, BindDoesntExistInHostError.prototype);
  }
}

export class DockerServerError extends HardhatDockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerServerError.prototype);
  }

  public getServerErrorMessage() {
    if (this.parent !== undefined) {
      const parentAsAny = this.parent as any;

      if (parentAsAny.json !== undefined) {
        return parentAsAny.json.message;
      }

      if (this.parent.message !== undefined) {
        return this.parent.message;
      }
    }

    return "Docker server error";
  }
}

export class ExecutableNotFoundError extends HardhatDockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, ExecutableNotFoundError.prototype);
  }
}
