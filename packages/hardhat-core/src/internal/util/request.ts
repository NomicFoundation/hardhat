import debug from "debug";

const log = debug("hardhat:util:request");

export async function requestJson(
  url: string,
  timeout?: number
): Promise<unknown> {
  const { request } = await import("undici");

  const controller = new AbortController();
  const requestAborted = new Error("Request aborted: timeout reached");

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeout !== undefined) {
    timeoutId = setTimeout(() => {
      controller.abort(requestAborted);
    }, timeout);
  }

  try {
    const response = await request(url, {
      method: "GET",
      signal: controller.signal,
    });

    if (response.statusCode !== 200) {
      return;
    }

    const jsonResponse = await response.body.json();

    return jsonResponse;
  } catch (error: any) {
    if (error === requestAborted) {
      log(`Request to ${url} aborted after ${timeout!}ms`);
    } else {
      log(`Request to ${url} failed: ${error}`);
    }
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
