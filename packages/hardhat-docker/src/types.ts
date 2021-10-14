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
  networkMode?: string;
}

export interface ProcessResult {
  statusCode: number;
  stdout: Buffer;
  stderr: Buffer;
}
