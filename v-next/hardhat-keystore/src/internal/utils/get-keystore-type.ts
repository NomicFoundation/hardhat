export function getKeystoreType(dev: boolean): "production" | "development" {
  return dev ? "development" : "production";
}
