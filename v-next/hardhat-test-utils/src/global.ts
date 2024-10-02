import { after, before } from "node:test";

export function doNotUseFetch(): void {
  let originalFetch: typeof global.fetch;

  before(async () => {
    originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error("Network requests are disabled");
    };
  });

  after(async () => {
    global.fetch = originalFetch;
  });
}
