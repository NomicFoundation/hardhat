import { exec } from "child_process";
import Docker, { ContainerCreateOptions } from "dockerode";
import fsExtra from "fs-extra";
import { IncomingMessage } from "http";
import fetch from "node-fetch";

import {
  BindDoesntExistInHostError,
  ConnectionError,
  DockerBadGatewayError,
  DockerNotInstalledError,
  DockerNotRunningError,
  DockerServerError,
  ImageDoesntExistError
} from "./errors";
import { WritableBufferStream } from "./streams";

export interface Image {
  tag: string;
  repository: string;
}

export interface BindsMap {
  [hostPath: string]: string;
}

export interface ContainerConfig {
  binds?: BindsMap;
  workingDirectory?: string;
}

export interface ProcessResult {
  statusCode: number;
  stdout: Buffer;
  stderr: Buffer;
}

export class BuidlerDocker {
  public static async create() {
    if (!(await BuidlerDocker.isInstalled())) {
      throw new DockerNotInstalledError();
    }

    return new BuidlerDocker();
  }

  public static async isInstalled(): Promise<boolean> {
    // TODO: This doesn't support windows
    return new Promise(resolve => {
      exec("which docker", (error?: any) => resolve(!error));
    });
  }

  public static imageToRepoTag(image: Image) {
    return `${image.repository}:${image.tag}`;
  }

  private readonly _docker: Docker = new Docker();

  // The constructor is private, see [[BuidlerDocker.create]].
  private constructor() {}

  public async isRunning(): Promise<boolean> {
    try {
      const result = await this._withCommonErrors(this._docker.ping());
      return result === "OK";
    } catch (error) {
      if (error instanceof DockerNotRunningError) {
        return false;
      }

      if (error instanceof DockerBadGatewayError) {
        return false;
      }

      throw error;
    }
  }

  public async imageExists(image: Image): Promise<boolean> {
    const repositoryPath = image.repository.includes("/")
      ? image.repository
      : "library/" + image.repository;

    const imageEndpoint = `https://registry.hub.docker.com/v2/repositories/${repositoryPath}/tags/${
      image.tag
    }/`;

    try {
      const res = await fetch(imageEndpoint);
      return res.ok;
    } catch (error) {
      throw new ConnectionError(error);
    }
  }

  public async hasPulledImage(image: Image): Promise<boolean> {
    if (!(await this.imageExists(image))) {
      throw new ImageDoesntExistError();
    }

    const images = await this._withCommonErrors<Docker.ImageInfo[]>(
      this._docker.listImages()
    );

    return images.some(img =>
      img.RepoTags.some(
        (repoAndTag: string) =>
          repoAndTag === BuidlerDocker.imageToRepoTag(image)
      )
    );
  }

  public async pullImage(image: Image): Promise<void> {
    if (await this.hasPulledImage(image)) {
      return;
    }

    if (!(await this.imageExists(image))) {
      throw new ImageDoesntExistError();
    }

    const im: IncomingMessage = await this._withCommonErrors(
      this._docker.pull(BuidlerDocker.imageToRepoTag(image), {})
    );

    return new Promise((resolve, reject) => {
      im.on("end", resolve);
      im.on("error", reject);

      // Not having the data handler causes the process to exit
      im.on("data", data => {});
    });
  }

  public async runContainer(
    image: Image,
    command: string[],
    config: ContainerConfig = {}
  ): Promise<ProcessResult> {
    await this._validateBindsMap(config.binds);

    const createOptions: ContainerCreateOptions = {
      Tty: false,
      WorkingDir: config.workingDirectory,
      Entrypoint: "",
      HostConfig: {
        AutoRemove: true,
        Binds: this._bindsMapToArray(config.binds)
      }
    };

    const stdout = new WritableBufferStream();
    const stderr = new WritableBufferStream();

    const container = await this._withCommonErrors(
      this._docker.run(
        BuidlerDocker.imageToRepoTag(image),
        command,
        [stdout, stderr],
        createOptions
      )
    );

    return {
      statusCode: container.output.StatusCode,
      stdout: stdout.buffer,
      stderr: stderr.buffer
    };
  }

  private async _validateBindsMap(map?: BindsMap) {
    if (map === undefined) {
      return;
    }

    for (const hostPath of Object.keys(map)) {
      if (!(await fsExtra.pathExists(hostPath))) {
        throw new BindDoesntExistInHostError(hostPath);
      }
    }
  }

  private async _withCommonErrors<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        throw new DockerNotRunningError(error);
      }

      if (error.statusCode === 502) {
        throw new DockerBadGatewayError(error);
      }

      if (error.statusCode === 500) {
        throw new DockerServerError(error);
      }

      throw error;
    }
  }

  private _bindsMapToArray(map?: BindsMap) {
    if (map === undefined) {
      return [];
    }

    return Object.entries(map).map(
      ([host, container]) => `${host}:${container}`
    );
  }
}
