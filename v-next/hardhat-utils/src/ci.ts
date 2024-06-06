/**
 * Checks whether the current process is running in a CI environment.
 *
 * @returns True if the current process is running in a CI environment.
 */
export function isCi() {
  const env = process.env;

  return !!(
    isGithubActions() ||
    isNow() ||
    isAwsCodeBuild() ||
    env.CI !== undefined || // Travis CI, CircleCI, Cirrus CI, GitLab CI, Appveyor, CodeShip, dsari
    env.CONTINUOUS_INTEGRATION !== undefined || // Travis CI, Cirrus CI
    env.BUILD_NUMBER !== undefined || // Jenkins, TeamCity
    env.RUN_ID !== undefined || // TaskCluster, dsari
    false
  );
}

function isGithubActions(): boolean {
  return process.env.GITHUB_ACTIONS !== undefined;
}

function isNow() {
  return (
    process.env.NOW !== undefined || process.env.DEPLOYMENT_ID !== undefined
  );
}

function isAwsCodeBuild() {
  return process.env.CODEBUILD_BUILD_NUMBER !== undefined;
}
