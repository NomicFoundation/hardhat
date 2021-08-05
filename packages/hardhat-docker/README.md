[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-docker.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-docker) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# `hardhat-docker`

## What

A library to manage Docker from Hardhat plugins.

## Installation

```bash
npm install @nomiclabs/hardhat-docker
```

## Usage

Importing HardhatDocker

```js
const { HardhatDocker } = require("@nomiclabs/hardhat-docker");
```

Running Docker container

```js
const image = { repository: "alpine", tag: "latest" };
const docker = await HardhatDocker.create();

if (!(await docker.hasPulledImage(image))) {
  await docker.pullImage(image);
}

const { statusCode, stdout, stderr } = await docker.runContainer(image, [
  "echo",
  "Hello world!",
]);

console.log(stdout.toString());
```

Available methods

| Method | Description | Arguments | Return Type |
| --- | --- | --- | --- |
| isInstalled | check if docker is installed |  | `Promise<boolean>` |
| imageExists | check if docker image is available on docker hub | Image | `Promise<boolean>` |
| hasPulledImage | check if docker image is pulled | Image | `Promise<boolean>` |
| isImageUpToDate | check if latest docker image is installed | Image | `Promise<boolean>` |
| pullImage | pulls docker image from docker hub | Image | `Promise<void>` |
| imageToRepoTag | returns image repository tag | Image | `String` |
| runContainer | runs docker container | Image, command | `Promise<ProcessResult>` |
