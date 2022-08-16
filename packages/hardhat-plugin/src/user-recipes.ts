import { UserRecipe } from "@nomicfoundation/ignition-core";
import setupDebug from "debug";
import fsExtra from "fs-extra";
import path from "path";

const debug = setupDebug("hardhat-ignition:recipes");

export function loadAllUserRecipes(
  userRecipesDirectory: string
): Array<UserRecipe<any>> {
  debug(`Loading all user recipes from '${userRecipesDirectory}'`);

  if (!fsExtra.existsSync(userRecipesDirectory)) {
    throw new Error(`Directory ${userRecipesDirectory} not found.`);
  }

  const resolvedUserRecipesPaths = getAllUserRecipesPaths(userRecipesDirectory);

  return getUserRecipesFromPaths(resolvedUserRecipesPaths);
}

export function loadUserRecipes(
  userRecipesDirectory: string,
  userRecipesFiles: string[] = []
): Array<UserRecipe<any>> {
  debug(`Loading user recipes from '${userRecipesDirectory}'`);

  if (!fsExtra.existsSync(userRecipesDirectory)) {
    throw new Error(`Directory ${userRecipesDirectory} not found.`);
  }

  const resolvedUserRecipesPaths = getUserRecipesPaths(
    userRecipesDirectory,
    userRecipesFiles
  );

  return getUserRecipesFromPaths(resolvedUserRecipesPaths);
}

export function getUserRecipesFromPaths(
  resolvedUserRecipesPaths: string[]
): Array<UserRecipe<any>> {
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

export function getUserRecipesPaths(
  userRecipesDirectory: string,
  userRecipesFiles: string[]
): string[] {
  return userRecipesFiles.map((x) => path.resolve(userRecipesDirectory, x));
}

export function getAllUserRecipesPaths(userRecipesDirectory: string) {
  return fsExtra
    .readdirSync(userRecipesDirectory)
    .filter((x) => !x.startsWith("."))
    .map((x) => path.resolve(userRecipesDirectory, x));
}
