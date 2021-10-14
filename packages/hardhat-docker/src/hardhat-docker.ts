import Docker, { ContainerCreateOptions } from "dockerode";
import fsExtra from "fs-extra";
import { IncomingMessage } from "http";

import {
  BindDoesntExistInHostError,
  DockerBadGatewayError,
  DockerHubConnectionError,
  DockerNotInstalledError,
  DockerNotRunningError,
  DockerServerError,
  ExecutableNotFoundError,
  ImageDoesntExistError,
} from "./errors";
import { WritableBufferStream } from "./streams";
import { BindsMap, ContainerConfig, Image, ProcessResult } from "./types";

const DOCKER_SOCKET_PATH = "/var/run/docker.sock";

export class HardhatDocker {
  public static async create() {
    if (!(await HardhatDocker.isInstalled())) {
      throw new DockerNotInstalledError();
    }

    // TODO: This doesn't support windows
    if (!(await fsExtra.pathExists(DOCKER_SOCKET_PATH))) {
      throw new DockerNotRunningError();
    }

    const { default: DockerImpl } = await import("dockerode");

    return new HardhatDocker(DockerImpl);
  }

  public static async isInstalled(): Promise<boolean> {
    // TODO: This doesn't support windows
    const { exec } = await import("child_process");
    return new Promise((resolve) => {
      exec("which docker", (error?: any) => resolve(!error));
    });
  }

  public static imageToRepoTag(image: Image) {
    return `${image.repository}:${image.tag}`;
  }

  private readonly _docker: Docker;

  // The constructor is private, see [[HardhatDocker.create]].
  private constructor(DockerImpl: typeof Docker) {
    // TODO: This doesn't support windows
    this._docker = new DockerImpl({ socketPath: DOCKER_SOCKET_PATH });
  }

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
    const repositoryPath = this._imageToRepositoryPath(image);

    const imageEndpoint = `https://registry.hub.docker.com/v2/repositories/${repositoryPath}/tags/${image.tag}/`;

    try {
      const { default: fetch } = await import("node-fetch");
      const res = await fetch(imageEndpoint);

      // Consume the response stream and discard its result
      // See: https://github.com/node-fetch/node-fetch/issues/83
      const _discarded = await res.text();

      return res.ok;
    } catch (error) {
      throw new DockerHubConnectionError(error);
    }
  }

  public async hasPulledImage(image: Image): Promise<boolean> {
    const images = await this._withCommonErrors<Docker.ImageInfo[]>(
      this._docker.listImages()
    );

    return images.some(
      (img) =>
        img.RepoTags !== null &&
        img.RepoTags.some(
          (repoAndTag: string) =>
            repoAndTag === HardhatDocker.imageToRepoTag(image)
        )
    );
  }

  public async isImageUpToDate(image: Image): Promise<boolean> {
    const images = await this._withCommonErrors<Docker.ImageInfo[]>(
      this._docker.listImages()
    );

    const imageInfo = images.find(
      (img) =>
        img.RepoTags !== null &&
        img.RepoTags.some(
          (repoAndTag: string) =>
            repoAndTag === HardhatDocker.imageToRepoTag(image)
        )
    );

    if (imageInfo === undefined) {
      return false;
    }

    const remoteId = await this._getRemoteImageId(image);

    return imageInfo.Id === remoteId;
  }

  public async pullImage(image: Image): Promise<void> {
    if (!(await this.imageExists(image))) {
      throw new ImageDoesntExistError(image);
    }

    const im: IncomingMessage = await this._withCommonErrors(
      this._docker.pull(HardhatDocker.imageToRepoTag(image), {})
    );

    return new Promise((resolve, reject) => {
      im.on("end", resolve);
      im.on("error", reject);

      // Not having the data handler causes the process to exit
      im.on("data", () => {});
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
        Binds: this._bindsMapToArray(config.binds),
        NetworkMode: config.networkMode,
      },
    };

    const stdout = new WritableBufferStream();
    const stderr = new WritableBufferStream();

    const container = await this._withCommonErrors(
      this._docker.run(
        HardhatDocker.imageToRepoTag(image),
        command,
        [stdout, stderr],
        createOptions
      )
    );

    return {
      statusCode: container.output.StatusCode,
      stdout: stdout.buffer,
      stderr: stderr.buffer,
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

      if (
        error.statusCode === 400 &&
        error.message !== undefined &&
        error.message.includes("executable file not found")
      ) {
        throw new ExecutableNotFoundError(error);
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

  private async _getRemoteImageId(image: Image): Promise<string> {
    const token = await this._getDockerRegistryTokenForImage(image);

    const endpoint = `https://registry-1.docker.io/v2/${this._imageToRepositoryPath(
      image
    )}/manifests/${image.tag}`;

    try {
      const { default: fetch } = await import("node-fetch");
      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/vnd.docker.distribution.manifest.v2+json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(
          `Docker Registry manifest request not successful ${await res.text()}`
        );
      }

      const json = await res.json();

      return json.config.digest;
    } catch (error) {
      throw new DockerHubConnectionError(error);
    }
  }

  private async _getDockerRegistryTokenForImage(image: Image): Promise<string> {
    const endpoint = `https://auth.docker.io/token?scope=repository:${this._imageToRepositoryPath(
      image
    )}:pull&service=registry.docker.io`;

    try {
      const { default: fetch } = await import("node-fetch");
      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error(
          `Docker Registry auth request not successful ${await res.text()}`
        );
      }

      const json = await res.json();

      return json.token;
    } catch (error) {
      throw new DockerHubConnectionError(error);
    }
  }

  private _imageToRepositoryPath(image: Image): string {
    return image.repository.includes("/")
      ? image.repository
      : `library/${image.repository}`;
  }
}
