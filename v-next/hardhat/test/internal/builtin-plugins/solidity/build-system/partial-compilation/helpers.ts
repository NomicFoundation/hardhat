/* eslint-disable @typescript-eslint/consistent-type-assertions -- test*/
import type { BuildInfo } from "../../../../../../src/types/artifacts.js";
import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";
import type { TestProject } from "../resolver/helpers.js";

import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  getAllFilesMatching,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

export async function getHRE(
  project: TestProject,
): Promise<HardhatRuntimeEnvironment> {
  process.chdir(project.path);
  return createHardhatRuntimeEnvironment({}, {}, project.path);
}

export interface FileDetail {
  path: string;
  modificationTime: Date;
}

interface BuildInfoDetail {
  path: string;
  modificationTime: any;
  buildId: string;
  sources: string[];
}

interface Snapshot {
  buildInfos: BuildInfoDetail[];
  buildInfoOutputs: Array<{
    path: string;
    modificationTime: any;
    buildId: string;
  }>;
  artifacts: Record<string, FileDetail[]>;
  typeFiles: Record<string, FileDetail>;
  buildIdReferences: Record<string, string>;
}

export class TestProjectWrapper {
  constructor(
    public project: TestProject,
    public hre: HardhatRuntimeEnvironment,
  ) {}

  public async compile(options: any = {}): Promise<void> {
    await this.hre.tasks.getTask(["compile"]).run({ ...options, quiet: true });
  }

  public async getSnapshot(): Promise<Snapshot> {
    const buildInfos = await this.getBuildInfoFiles();
    const buildInfoOutputs = await this.getBuildInfoOutputFiles();
    const artifacts = await this.getArtifacts();
    const typeFiles = await this.getTypefiles();

    const buildIdReferences = await this.getBuildIdReferences(artifacts);
    // const modificationTimes = await this.getModificationTimes();

    return {
      buildInfos,
      buildInfoOutputs,
      artifacts,
      typeFiles,
      buildIdReferences,
    };
  }

  public buildInfosBasePath(): string {
    return path.join(this.project.path, "artifacts", "build-info");
  }

  public artifactsBasePath(): string {
    return path.join(this.project.path, "artifacts", "contracts");
  }

  public async getBuildInfoFiles(): Promise<
    Array<{
      path: string;
      modificationTime: any;
      buildId: string;
      sources: string[];
    }>
  > {
    const filePaths = (await readdir(this.buildInfosBasePath()))
      .filter((filePath) => !filePath.endsWith(".output.json"))
      .map((basename) => path.join(this.buildInfosBasePath(), basename));

    return Promise.all(
      filePaths.map(async (filePath) => {
        const modificationTime = await this.getModificationTime(filePath);
        const buildId = path.basename(filePath).replace(".json", "");
        const sources = Object.keys(
          ((await readJsonFile(filePath)) as BuildInfo).input.sources,
        ).map((sourceName) => sourceName.replace("project/contracts/", ""));

        return {
          path: filePath,
          modificationTime,
          buildId,
          sources,
        };
      }),
    );
  }

  public async getBuildInfoOutputFiles(): Promise<
    Array<{
      path: string;
      modificationTime: any;
      buildId: string;
    }>
  > {
    const filePaths = (await readdir(this.buildInfosBasePath()))
      .filter((filePath) => filePath.endsWith(".output.json"))
      .map((basename) => path.join(this.buildInfosBasePath(), basename));

    return Promise.all(
      filePaths.map(async (filePath) => ({
        path: filePath,
        modificationTime: await this.getModificationTime(filePath),
        buildId: path.basename(filePath).replace(".output.json", ""),
      })),
    );
  }

  public async getModificationTime(filePath: string): Promise<Date> {
    return (await stat(filePath)).ctime;
  }

  public async getArtifactFolders(): Promise<string[]> {
    return readdir(this.artifactsBasePath());
  }

  public async getArtifacts(): Promise<Record<string, FileDetail[]>> {
    const artifacts: Record<string, FileDetail[]> = {};

    const artifactPaths = await getAllFilesMatching(
      this.artifactsBasePath(),
      (_path) => _path.endsWith(".json"),
    );

    for (const artifactPath of artifactPaths) {
      const sourceName = artifactPath
        .replace(`${this.artifactsBasePath() + path.sep}`, "")
        .replace(`${path.sep + path.basename(artifactPath)}`, "");

      artifacts[sourceName] ??= [];
      artifacts[sourceName].push({
        path: artifactPath,
        modificationTime: await this.getModificationTime(artifactPath),
      });
    }

    return artifacts;
  }

  public async getTypefiles(): Promise<Record<string, FileDetail>> {
    const typefiles: Record<string, FileDetail> = {};

    const typefilePaths = await getAllFilesMatching(
      this.artifactsBasePath(),
      (_path) => _path.endsWith("artifacts.d.ts"),
    );

    for (const typefilePath of typefilePaths) {
      const sourceName = this.getSourcenameFromArtifactPath(typefilePath);
      typefiles[sourceName] = {
        path: typefilePath,
        modificationTime: await this.getModificationTime(typefilePath),
      };
    }

    return typefiles;
  }

  public async getBuildIdReferences(
    artifacts: Record<string, FileDetail[]>,
  ): Promise<Record<string, string>> {
    const buildIdReferences: Record<string, string> = {};

    const artifactPaths = Object.values(artifacts)
      .flat()
      .map((f) => f.path);

    for (const artifactPath of artifactPaths) {
      const artifactContent = (await readFile(artifactPath)).toString();
      const artifact = JSON.parse(artifactContent);
      buildIdReferences[artifactPath] = artifact.buildInfoId;
    }

    return buildIdReferences;
  }

  public getSourcenameFromArtifactPath(artifactPath: string): string {
    return artifactPath
      .replace(`${this.artifactsBasePath() + path.sep}`, "")
      .replace(`${path.sep + path.basename(artifactPath)}`, "");
  }

  public getBuildInfoForSourceFile(
    snapshot: Snapshot,
    source: string,
  ): BuildInfoDetail {
    const artifacts = snapshot.artifacts[source];

    if (artifacts === undefined || artifacts.length === 0) {
      throw new Error(`No artifacts on snapshot for source ${source}`);
    }

    const buildInfoId = snapshot.buildIdReferences[artifacts[0].path];

    if (buildInfoId === undefined) {
      throw new Error(`No build info reference for ${artifacts[0].path}`);
    }

    const buildInfo = snapshot.buildInfos.find(
      (bi) => bi.buildId === buildInfoId,
    );

    if (buildInfo === undefined) {
      throw new Error(`Couldnt find build info with id ${buildInfoId}`);
    }

    return buildInfo;
  }
}

export function assertFileCounts(
  snapshot: Snapshot,
  buildInfoCount: number,
  artifactCount: number,
  typefileCount: number,
): void {
  assert.equal(snapshot.buildInfos.length, buildInfoCount);
  assert.equal(Object.entries(snapshot.typeFiles).length, typefileCount);
  assert.equal(Object.values(snapshot.artifacts).flat().length, artifactCount);
}
