import { Module } from "@ignored/ignition-core";
import setupDebug from "debug";
import fsExtra from "fs-extra";
import path from "path";

const debug = setupDebug("hardhat-ignition:recipes");

export function loadAllUserModules(userRecipesDirectory: string): Module[] {
  debug(`Loading all user modules from '${userRecipesDirectory}'`);

  if (!fsExtra.existsSync(userRecipesDirectory)) {
    throw new Error(`Directory ${userRecipesDirectory} not found.`);
  }

  const resolvedUserRecipesPaths = getAllUserModulesPaths(userRecipesDirectory);

  return getUserModulesFromPaths(resolvedUserRecipesPaths);
}

export function loadUserModules(
  userRecipesDirectory: string,
  userRecipesFiles: string[] = []
): Module[] {
  debug(`Loading user modules from '${userRecipesDirectory}'`);

  if (!fsExtra.existsSync(userRecipesDirectory)) {
    throw new Error(`Directory ${userRecipesDirectory} not found.`);
  }

  const resolvedUserRecipesPaths = getUserModulesPaths(
    userRecipesDirectory,
    userRecipesFiles
  );

  return getUserModulesFromPaths(resolvedUserRecipesPaths);
}

export function getUserModulesFromPaths(
  resolvedUserRecipesPaths: string[]
): Module[] {
  debug(`Loading '${resolvedUserRecipesPaths.length}' recipe files`);

  const userRecipes: any[] = [];
  for (const pathToFile of resolvedUserRecipesPaths) {
    const fileExists = fsExtra.pathExistsSync(pathToFile);
    if (!fileExists) {
      throw new Error(`Recipe ${pathToFile} doesn't exist`);
    }

    debug(`Loading recipe file '${pathToFile}'`);

    const userRecipe = require(pathToFile);
    userRecipes.push(userRecipe.default ?? userRecipe);
  }

  return userRecipes;
}

export function getUserModulesPaths(
  userRecipesDirectory: string,
  userRecipesFiles: string[]
): string[] {
  return userRecipesFiles.map((x) => path.resolve(userRecipesDirectory, x));
}

export function getAllUserModulesPaths(userRecipesDirectory: string) {
  return fsExtra
    .readdirSync(userRecipesDirectory)
    .filter((x) => !x.startsWith("."))
    .map((x) => path.resolve(userRecipesDirectory, x));
}
