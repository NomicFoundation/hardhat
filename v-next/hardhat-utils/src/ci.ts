/**
 * Checks whether the current process is running in a CI environment.
 *
 * @returns True if the current process is running in a CI environment.
 */
export function isCi(): boolean {
  const env = process.env;

  const result =
    env.GITHUB_ACTIONS !== undefined || // GitHub Actions
    env.NOW !== undefined || // Vercel Now
    env.DEPLOYMENT_ID !== undefined || // Vercel Now
    env.CODEBUILD_BUILD_NUMBER !== undefined || // AWS CodeBuild
    env.CI !== undefined || // Travis CI, CircleCI, Cirrus CI, GitLab CI, Appveyor, CodeShip, dsari
    env.CONTINUOUS_INTEGRATION !== undefined || // Travis CI, Cirrus CI
    env.BUILD_NUMBER !== undefined || // Jenkins, TeamCity
    env.RUN_ID !== undefined; // TaskCluster, dsari

  const {
    GITHUB_ACTIONS,
    NOW,
    CI,
    DEPLOYMENT_ID,
    BUILD_NUMBER,
    RUN_ID,
    CONTINUOUS_INTEGRATION,
  } = env;

  console.log("--------------------------> CI env", {
    GITHUB_ACTIONS,
    NOW,
    CI,
    DEPLOYMENT_ID,
    BUILD_NUMBER,
    RUN_ID,
    CONTINUOUS_INTEGRATION,
  });

  return result;
}
