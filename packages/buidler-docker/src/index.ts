const path = require("path");
const Docker = require("dockerode");
const exec = require("child_process").exec;
const { promisify } = require("util");

// [ ] Detecting if Docker Desktop is installed
// [ ] Detecting if Docker Desktop is running
// [ ] Detecting if the users hasn't logged in to Docker
// [ ] Detecting if an image has already been pulled
// [ ] Detecting if an image doesn't exist in docker hub
// [ ] Pulling images
// [ ] Detecting if a port is busy
// [ ] Running images
//     [ ] Piping to stdin
//     [ ] Mounting folders
//     [ ] Forwarding ports
//     [ ] Starting and stopping long running processes

async function isDockerInstalled(): Promise<boolean> {
  const error = await new Promise(resolve =>
    exec("which docker", (error?: any) => resolve(error))
  );

  return error === null;
}

export async function tryPull(image: string) {
  new Docker().pull(image).then((data: any) => {
    data.pipe(process.stdout);
  });
}

// async function isDockerRunning(docker) {
//   const result = await docker.ping();
//   return result === "OK";
// }

// async function hasImage(docker, repository, tag) {
//   const images = await docker.listImages();

//   return images.some(image =>
//     image.RepoTags.some(rt => rt === `${repository}:${tag}`)
//   );
// }

async function main() {
  // TODO: This doesn't support windows as is, see:
  // https://github.com/apocas/dockerode/issues/290#issuecomment-276393388
  const docker = new Docker();

  docker.run(
    "ethereum/vyper:0.1.0b9",
    ["-f", "combined_json", "a.vy"],
    process.stdout,
    {
      Tty: true,
      HostConfig: { Binds: [`${path.join(__dirname, "../")}:/code`] }
    }
  );
}

// isDockerInstalled().then(console.log);
