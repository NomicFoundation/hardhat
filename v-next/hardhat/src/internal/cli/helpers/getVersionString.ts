export async function getVersionString(): Promise<string> {
  const { default: packageJson } = await import("../../../../package.json", {
    with: { type: "json" },
  });

  return packageJson.version;
}
