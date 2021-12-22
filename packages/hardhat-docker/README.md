[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-docker.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-docker) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# `hardhat-docker`

# ⚠ <u>**Deprecation notice**</u> ⚠

This package was originally created as a way to support Vyper compilation as there were no official Vyper binaries available at the time. However, that is no longer the case, and, as such, this package will not be supported moving forward.

While this package will remain available on NPM for the time being, we highly recommend updating to the newest version of [`hardhat-vyper`](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-vyper) as it is more stable and utilizes native Vyper binaries for compilation.

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
