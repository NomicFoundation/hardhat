import type UndiciT from "undici";

import assert from "node:assert/strict";
import path from "node:path";
import querystring from "node:querystring";
import { beforeEach, describe, it } from "node:test";

import { expectTypeOf } from "expect-type";
import { ProxyAgent, Pool, Agent, Client } from "undici";

import { ensureError } from "../src/error.js";
import { exists, readUtf8File, readdir } from "../src/fs.js";
import {
  generateTempFilePath,
  getBaseDispatcherOptions,
  getBaseRequestOptions,
} from "../src/internal/request.js";
import {
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_TIMEOUT_IN_MILLISECONDS,
  DEFAULT_USER_AGENT,
  getRequest,
  postJsonRequest,
  postFormRequest,
  download,
  getDispatcher,
  shouldUseProxy,
  isValidUrl,
  getProxyUrl,
} from "../src/request.js";

import { createTestEnvManager } from "./helpers/env.js";
import { createTmpDir } from "./helpers/fs.js";
import { initializeTestDispatcher } from "./helpers/request.js";

// The responseError interceptor only decodes the body of application/json and
// text/plain responses, so mocked error replies need an explicit Content-Type.
const jsonResponseOptions = {
  headers: { "Content-Type": "application/json" },
};

describe("Requests util", () => {
  describe("getDispatcher", () => {
    const { setEnvVar, unsetEnvVar } = createTestEnvManager();

    beforeEach(() => {
      for (const name of [
        "https_proxy",
        "HTTPS_PROXY",
        "http_proxy",
        "HTTP_PROXY",
        "no_proxy",
        "NO_PROXY",
      ]) {
        unsetEnvVar(name);
      }
    });

    it("Should return a ProxyAgent dispatcher if a proxy url was provided", async () => {
      const dispatcher = await getDispatcher("http://localhost", {
        proxy: "http://proxy",
      });

      assert.ok(dispatcher instanceof ProxyAgent, "Should return a ProxyAgent");
    });

    it("Should return a Pool dispatcher if pool is true", async () => {
      const dispatcher = await getDispatcher("http://localhost", {
        pool: true,
      });

      assert.ok(dispatcher instanceof Pool, "Should return a Pool");
    });

    it("Should throw if both pool and proxy are set", async () => {
      await assert.rejects(
        getDispatcher("http://localhost", {
          pool: true,
          proxy: "http://proxy",
        }),
        {
          name: "DispatcherError",
          message:
            "Failed to create dispatcher: The pool and proxy options can't be used at the same time",
        },
      );
    });

    it("Should return an Agent dispatcher if proxy is not set and pool is false", async () => {
      const dispatcher = await getDispatcher("http://localhost", {
        pool: false,
      });

      assert.ok(dispatcher instanceof Agent, "Should return an Agent");
    });

    it("Should return an Agent dispatcher if proxy is not set and pool is not set", async () => {
      const dispatcher = await getDispatcher("http://localhost");

      assert.ok(dispatcher instanceof Agent, "Should return an Agent");
    });

    describe("Proxy resolved from the environment", () => {
      const PROXY_URL = "http://proxy.example.com:8080";
      const URL_TO_PROXY = "https://example.com";

      it("Should return a ProxyAgent if the environment configures a proxy", async () => {
        setEnvVar("HTTPS_PROXY", PROXY_URL);
        const dispatcher = await getDispatcher(URL_TO_PROXY);

        assert.ok(
          dispatcher instanceof ProxyAgent,
          "Should return a ProxyAgent",
        );
      });

      // Both branches build a ProxyAgent, so the environment holds an invalid
      // url: reaching for it at all would throw, and not throwing is what
      // shows the explicit option won.
      it("Should prefer an explicitly passed proxy over the environment", async () => {
        setEnvVar("HTTPS_PROXY", "not-a-url");
        const dispatcher = await getDispatcher(URL_TO_PROXY, {
          proxy: PROXY_URL,
        });

        assert.ok(
          dispatcher instanceof ProxyAgent,
          "Should return a ProxyAgent",
        );
      });

      it("Should return an Agent if NO_PROXY excludes the url", async () => {
        setEnvVar("HTTPS_PROXY", PROXY_URL);
        setEnvVar("NO_PROXY", "example.com");
        const dispatcher = await getDispatcher(URL_TO_PROXY);

        assert.ok(dispatcher instanceof Agent, "Should return an Agent");
      });

      it("Should return an Agent for a loopback url", async () => {
        setEnvVar("HTTP_PROXY", PROXY_URL);
        const dispatcher = await getDispatcher("http://127.0.0.1:8545");

        assert.ok(dispatcher instanceof Agent, "Should return an Agent");
      });

      it("Should return an Agent for a url whose protocol can't be proxied", async () => {
        setEnvVar("HTTPS_PROXY", PROXY_URL);
        const dispatcher = await getDispatcher("ws://example.com");

        assert.ok(dispatcher instanceof Agent, "Should return an Agent");
      });

      // A Pool is bound to a single origin and can't tunnel, so the proxy wins.
      it("Should let a proxy from the environment override pool", async () => {
        setEnvVar("HTTPS_PROXY", PROXY_URL);
        const dispatcher = await getDispatcher(URL_TO_PROXY, { pool: true });

        assert.ok(
          dispatcher instanceof ProxyAgent,
          "Should return a ProxyAgent",
        );
      });

      it("Should return a Pool if the environment configures no proxy", async () => {
        const dispatcher = await getDispatcher(URL_TO_PROXY, { pool: true });

        assert.ok(dispatcher instanceof Pool, "Should return a Pool");
      });

      // Only a caller asking for both at once is a mistake, and `pool: false`
      // isn't asking for a pool.
      it("Should not throw if a proxy is passed with pool set to false", async () => {
        const dispatcher = await getDispatcher(URL_TO_PROXY, {
          pool: false,
          proxy: PROXY_URL,
        });

        assert.ok(
          dispatcher instanceof ProxyAgent,
          "Should return a ProxyAgent",
        );
      });

      it("Should throw if the environment's proxy url is invalid", async () => {
        setEnvVar("HTTPS_PROXY", "127.0.0.1:8080");

        await assert.rejects(getDispatcher(URL_TO_PROXY), (error) => {
          ensureError(error);
          assert.equal(error.name, "DispatcherError");
          ensureError(error.cause);
          assert.equal(error.cause.name, "InvalidProxyUrlError");
          // Case-insensitive: on Windows the two casings are the same
          // variable, so the lookup can report either one.
          assert.ok(
            "envVarName" in error.cause &&
              typeof error.cause.envVarName === "string" &&
              /https_proxy/i.test(error.cause.envVarName),
            "Should expose the offending environment variable name",
          );
          assert.ok(
            /https_proxy/i.test(error.cause.message),
            "Should name the offending environment variable",
          );
          assert.ok(
            !error.cause.message.includes("127.0.0.1:8080"),
            "Should not echo the value, as it can carry credentials",
          );

          return true;
        });
      });
    });

    describe("getBaseDispatcherOptions", () => {
      it("Should return the default options if no options are passed", () => {
        const expectedOptions = {
          headersTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          bodyTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          connectTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
        };
        const options = getBaseDispatcherOptions();

        expectTypeOf(options).toEqualTypeOf<UndiciT.Client.Options>();
        assert.deepEqual(options, expectedOptions);
      });

      it("Should return the options with the provided timeout", () => {
        const timeout = 1000;
        const expectedOptions = {
          headersTimeout: timeout,
          bodyTimeout: timeout,
          connectTimeout: timeout,
        };
        const options = getBaseDispatcherOptions(timeout);

        assert.deepEqual(options, expectedOptions);
      });

      it("Should return the options with the provided keepAliveTimeouts for tests", () => {
        const expectedOptions = {
          headersTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          bodyTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          connectTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          keepAliveTimeout: 10,
          keepAliveMaxTimeout: 10,
        };
        const options = getBaseDispatcherOptions(undefined, true);

        assert.deepEqual(options, expectedOptions);
      });

      it("Should return the options with the provided keepAliveTimeouts for tests and the provided timeout", () => {
        const timeout = 1000;
        const expectedOptions = {
          headersTimeout: timeout,
          bodyTimeout: timeout,
          connectTimeout: timeout,
          keepAliveTimeout: 10,
          keepAliveMaxTimeout: 10,
        };
        const options = getBaseDispatcherOptions(timeout, true);

        assert.deepEqual(options, expectedOptions);
      });
    });
  });

  describe("getBaseRequestOptions", () => {
    it("Should return the default options if no options are passed", async () => {
      const url = "http://localhost";
      const expectedOptions = {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
        },
      };
      const { dispatcher, ...options } = await getBaseRequestOptions(url);

      assert.ok(dispatcher instanceof Agent, "Should return an Agent");
      assert.deepEqual(options, expectedOptions);
    });

    it("Should add the Authorization header if the url has a username and password", async () => {
      const url = "http://user:password@localhost";
      const expectedHeaders = {
        "User-Agent": DEFAULT_USER_AGENT,
        Authorization: `Basic ${Buffer.from(`user:password`).toString(
          "base64",
        )}`,
      };
      const { headers } = await getBaseRequestOptions(url);

      assert.deepEqual(headers, expectedHeaders);
    });

    it("Should add extra headers", async () => {
      const url = "http://localhost";
      const extraHeaders = {
        "X-Custom-Header": "value",
      };
      const expectedHeaders = {
        "User-Agent": DEFAULT_USER_AGENT,
        "X-Custom-Header": "value",
      };
      const { headers } = await getBaseRequestOptions(url, { extraHeaders });

      assert.deepEqual(headers, expectedHeaders);
    });

    it("Should override the User-Agent header", async () => {
      const url = "http://localhost";
      const extraHeaders = {
        "User-Agent": "Custom",
      };
      const expectedHeaders = {
        "User-Agent": "Custom",
      };
      const { headers } = await getBaseRequestOptions(url, { extraHeaders });

      assert.deepEqual(headers, expectedHeaders);
    });

    it("Should compose the interceptors onto the provided dispatcher", async () => {
      const url = "http://localhost";
      const dispatcher = new Client(url);
      dispatcher.pipelining = 123456789; // Arbitrary value to check that the returned dispatcher is a proxy

      const { dispatcher: returnedDispatcher } = await getBaseRequestOptions(
        url,
        {},
        dispatcher,
      );

      // Composing returns a proxy over the provided dispatcher, in which
      // `dispatch` is wrapped by the interceptors and every other property is
      // read from the original.
      assert.notEqual(
        returnedDispatcher.dispatch,
        dispatcher.dispatch,
        "Should wrap dispatch with the interceptors",
      );

      assert.ok(
        returnedDispatcher instanceof Client,
        "Should proxy the provided dispatcher",
      );
      assert.equal(
        returnedDispatcher.pipelining,
        123456789,
        "Should read the properties of the provided dispatcher",
      );
    });

    it("Should return a dispatcher based on the provided options", async () => {
      const url = "http://localhost";
      const { dispatcher } = await getBaseRequestOptions(url, undefined, {
        pool: true,
      });

      assert.ok(dispatcher instanceof Pool, "Should return a Pool");
    });

    it("Should return the provided signal", async () => {
      const url = "http://localhost";
      const { signal } = new AbortController();
      const { signal: returnedSignal } = await getBaseRequestOptions(url, {
        abortSignal: signal,
      });

      assert.equal(returnedSignal, signal);
    });

    it("Should return the provided queryParams", async () => {
      const url = "http://localhost";
      const queryParams = {
        foo: "bar",
      };
      const { query: returnedQueryParams } = await getBaseRequestOptions(url, {
        queryParams,
      });

      assert.deepEqual(returnedQueryParams, queryParams);
    });
  });

  describe("getRequest", async () => {
    const { interceptor, dispatcher } = await initializeTestDispatcher();
    const url = "http://localhost";
    const baseInterceptorOptions = {
      path: "/",
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };

    it("Should make a basic get request", async () => {
      interceptor.intercept(baseInterceptorOptions).reply(200, {});
      const response = await getRequest(url, undefined, dispatcher);

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should make a get request with query parameters", async () => {
      const queryParams = {
        foo: "bar",
        baz: "qux",
      };
      interceptor
        .intercept({ ...baseInterceptorOptions, query: queryParams })
        .reply(200, {});
      const response = await getRequest(url, { queryParams }, dispatcher);

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should make a get request with extra headers", async () => {
      const extraHeaders = {
        "X-Custom-Header": "value",
      };
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          headers: { ...baseInterceptorOptions.headers, ...extraHeaders },
        })
        .reply(200, {});
      const response = await getRequest(url, { extraHeaders }, dispatcher);

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should allow aborting a request using an abort signal", async () => {
      const abortController = new AbortController();
      interceptor.intercept(baseInterceptorOptions).reply(200, {});
      const requestPromise = getRequest(
        url,
        { abortSignal: abortController.signal },
        dispatcher,
      );
      abortController.abort();

      await assert.rejects(requestPromise, (err) => {
        ensureError(err);
        ensureError(err.cause);
        assert.equal(err.cause.name, "AbortError");
        return true;
      });
    });

    it("Should follow redirects", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(301, "", { headers: { location: `${url}/redirected` } });
      interceptor
        .intercept({ ...baseInterceptorOptions, path: "/redirected" })
        .reply(200, {});

      const response = await getRequest(url, undefined, dispatcher);

      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should throw if the request fails", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      await assert.rejects(getRequest(url, undefined, dispatcher), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });

    it("Should stop following redirects after DEFAULT_MAX_REDIRECTS", async () => {
      // One redirect more than the limit. The last one replies with a distinct
      // status code so that we can tell it was returned instead of followed.
      for (let i = 0; i <= DEFAULT_MAX_REDIRECTS; i++) {
        interceptor
          .intercept({
            ...baseInterceptorOptions,
            path: i === 0 ? "/" : `/redirect-${i}`,
          })
          .reply(i === DEFAULT_MAX_REDIRECTS ? 302 : 301, "", {
            headers: { location: `${url}/redirect-${i + 1}` },
          });
      }

      const response = await getRequest(url, undefined, dispatcher);

      assert.equal(response.statusCode, 302);
      await response.body.text();
    });

    it("Should describe the status code in the cause of a failed request", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(400, { error: "Bad Request" }, jsonResponseOptions);

      await assert.rejects(getRequest(url, undefined, dispatcher), (err) => {
        ensureError(err);
        ensureError(err.cause);
        assert.equal(
          err.cause.message,
          "Response status code 400: Bad Request",
        );
        return true;
      });
    });
  });

  describe("postJsonRequest", async () => {
    const { interceptor, dispatcher } = await initializeTestDispatcher();
    const url = "http://localhost";
    const body = { foo: "bar" };
    const baseInterceptorOptions = {
      path: "/",
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };

    it("Should make a basic post request", async () => {
      interceptor.intercept(baseInterceptorOptions).reply(200, {});
      const response = await postJsonRequest(url, body, undefined, dispatcher);

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should make a post request with query parameters", async () => {
      const queryParams = {
        baz: "qux",
      };
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          query: queryParams,
        })
        .reply(200, {});
      const response = await postJsonRequest(
        url,
        body,
        { queryParams },
        dispatcher,
      );

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should make a post request with extra headers", async () => {
      const extraHeaders = {
        "X-Custom-Header": "value",
      };
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          headers: { ...baseInterceptorOptions.headers, ...extraHeaders },
        })
        .reply(200, {});
      const response = await postJsonRequest(
        url,
        body,
        { extraHeaders },
        dispatcher,
      );

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should allow aborting a request using an abort signal", async () => {
      const abortController = new AbortController();
      interceptor.intercept(baseInterceptorOptions).reply(200, {});
      const requestPromise = postJsonRequest(
        url,
        body,
        { abortSignal: abortController.signal },
        dispatcher,
      );
      abortController.abort();

      await assert.rejects(requestPromise, (err) => {
        ensureError(err);
        ensureError(err.cause);
        assert.equal(err.cause.name, "AbortError");
        return true;
      });
    });

    it("Should throw if the request fails", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      await assert.rejects(postJsonRequest(url, body, undefined, dispatcher), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });
  });

  describe("postFormRequest", async () => {
    const { interceptor, dispatcher } = await initializeTestDispatcher();
    const url = "http://localhost";
    const body = { foo: "bar" };
    const baseInterceptorOptions = {
      path: "/",
      method: "POST",
      body: querystring.stringify(body),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };

    it("Should make a basic post request", async () => {
      interceptor.intercept(baseInterceptorOptions).reply(200, {});
      const response = await postFormRequest(url, body, undefined, dispatcher);

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should make a post request with query parameters", async () => {
      const queryParams = {
        baz: "qux",
      };
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          query: queryParams,
        })
        .reply(200, {});
      const response = await postFormRequest(
        url,
        body,
        { queryParams },
        dispatcher,
      );

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should make a post request with extra headers", async () => {
      const extraHeaders = {
        "X-Custom-Header": "value",
      };
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          headers: { ...baseInterceptorOptions.headers, ...extraHeaders },
        })
        .reply(200, {});
      const response = await postFormRequest(
        url,
        body,
        { extraHeaders },
        dispatcher,
      );

      assert.notEqual(response, undefined, "Should return a response");
      assert.equal(response.statusCode, 200);
      await response.body.json();
    });

    it("Should allow aborting a request using an abort signal", async () => {
      const abortController = new AbortController();
      interceptor.intercept(baseInterceptorOptions).reply(200, {});
      const requestPromise = postFormRequest(
        url,
        body,
        { abortSignal: abortController.signal },
        dispatcher,
      );
      abortController.abort();

      await assert.rejects(requestPromise, (err) => {
        ensureError(err);
        ensureError(err.cause);
        assert.equal(err.cause.name, "AbortError");
        return true;
      });
    });

    it("Should throw if the request fails", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      await assert.rejects(postFormRequest(url, body, undefined, dispatcher), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });
  });

  describe("download", async () => {
    const { interceptor, dispatcher } = await initializeTestDispatcher();
    const tmp = createTmpDir("request", "test");
    const url = "http://localhost";
    const baseInterceptorOptions = {
      path: "/",
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };

    it("Should download a file", async () => {
      const destination = path.join(tmp.path, "file.txt");
      interceptor.intercept(baseInterceptorOptions).reply(200, "file content");
      await download(url, destination, undefined, dispatcher);

      assert.ok(await exists(destination), "Should create the file");
      assert.equal(await readUtf8File(destination), "file content");
    });

    it("Should throw if the request fails", async () => {
      const destination = path.join(tmp.path, "file.txt");
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      await assert.rejects(download(url, destination, undefined, dispatcher), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });

    it("Should not leave temp files after a failed download", async () => {
      const tmpDir = tmp.path;
      const destination = path.join(tmpDir, "file.txt");
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      await assert.rejects(download(url, destination, undefined, dispatcher));

      const files = await readdir(tmpDir);
      const tempFiles = files.filter((f) => f.startsWith("tmp-"));
      assert.deepEqual(
        tempFiles,
        [],
        "No temp files should remain after a failed download",
      );
    });
  });

  describe("generateTempFilePath", () => {
    const tmp = createTmpDir("generateTempFilePath", "test");

    it("Should produce unique paths for the same input", async () => {
      const filePath = path.join(tmp.path, "list.json");
      const result1 = await generateTempFilePath(filePath);
      const result2 = await generateTempFilePath(filePath);

      assert.notEqual(
        result1,
        result2,
        "Two calls should produce different paths",
      );
    });

    it("Should preserve directory and extension", async () => {
      const dir = tmp.path;
      const filePath = path.join(dir, "list.json");
      const result = await generateTempFilePath(filePath);
      const parsed = path.parse(result);

      assert.equal(parsed.dir, dir);
      assert.equal(parsed.ext, ".json");
    });

    it("Should have a name starting with tmp-<originalName>-", async () => {
      const filePath = path.join(tmp.path, "list.json");
      const result = await generateTempFilePath(filePath);
      const parsed = path.parse(result);

      assert.ok(
        parsed.name.startsWith("tmp-list-"),
        `Expected name to start with "tmp-list-", got "${parsed.name}"`,
      );
    });
  });

  describe("shouldUseProxy", () => {
    const { setEnvVar, unsetEnvVar } = createTestEnvManager();

    // A NO_PROXY configured in the environment running the tests would
    // otherwise decide the result of the cases below.
    beforeEach(() => {
      unsetEnvVar("no_proxy");
      unsetEnvVar("NO_PROXY");
    });

    it("Should return false if NO_PROXY is '*'", () => {
      setEnvVar("NO_PROXY", "*");
      assert.equal(shouldUseProxy("http://example.com"), false);
    });

    it("Should handle a mix of proxied and non-proxied URLs in NO_PROXY", () => {
      setEnvVar("NO_PROXY", "example.com,other.com");
      assert.equal(shouldUseProxy("http://example.com"), false);
      assert.equal(shouldUseProxy("http://other.com"), false);
      assert.equal(shouldUseProxy("http://different.com"), true);
    });

    it("Should return true if NO_PROXY is not defined", () => {
      assert.equal(shouldUseProxy("http://example.com"), true);
    });

    it("Should ignore the protocol part of the URL", () => {
      setEnvVar("NO_PROXY", "example.com");
      assert.equal(shouldUseProxy("http://example.com"), false);
      assert.equal(shouldUseProxy("https://example.com"), false);
      assert.equal(shouldUseProxy("ftp://example.com"), false);
    });

    it("Should read no_proxy as well as NO_PROXY", () => {
      setEnvVar("no_proxy", "example.com");
      assert.equal(shouldUseProxy("http://example.com"), false);
    });

    it("Should treat an empty or whitespace-only NO_PROXY as unset", () => {
      setEnvVar("NO_PROXY", "");
      assert.equal(shouldUseProxy("http://example.com"), true);

      setEnvVar("NO_PROXY", "   ");
      assert.equal(shouldUseProxy("http://example.com"), true);
    });

    // Skipped on Windows, where the two casings are the same variable.
    it(
      "Should fall through an empty no_proxy to NO_PROXY",
      { skip: process.platform === "win32" },
      () => {
        setEnvVar("NO_PROXY", "example.com");
        setEnvVar("no_proxy", "");
        assert.equal(shouldUseProxy("http://example.com"), false);

        setEnvVar("no_proxy", "   ");
        assert.equal(shouldUseProxy("http://example.com"), false);
      },
    );

    describe("Loopback addresses", () => {
      // These are never proxied, so that a local node stays reachable when a
      // proxy is configured for everything else.
      it("Should return false for every loopback form", () => {
        assert.equal(shouldUseProxy("http://localhost:8545"), false);
        assert.equal(shouldUseProxy("http://api.localhost"), false);
        assert.equal(shouldUseProxy("http://127.0.0.1:8545"), false);
        assert.equal(shouldUseProxy("http://127.1.2.3"), false);
        assert.equal(shouldUseProxy("http://[::1]:8545"), false);
        assert.equal(shouldUseProxy("http://0.0.0.0:8545"), false);
      });

      it("Should not mistake a lookalike hostname for loopback", () => {
        assert.equal(shouldUseProxy("http://notlocalhost"), true);
        assert.equal(shouldUseProxy("http://localhost.example.com"), true);
        assert.equal(shouldUseProxy("http://127.0.0.1.example.com"), true);
      });
    });

    describe("NO_PROXY entry forms", () => {
      it("Should accept whitespace as a separator, and trim entries", () => {
        setEnvVar("NO_PROXY", " example.com ,\tother.com different.com ");
        assert.equal(shouldUseProxy("http://example.com"), false);
        assert.equal(shouldUseProxy("http://other.com"), false);
        assert.equal(shouldUseProxy("http://different.com"), false);
        assert.equal(shouldUseProxy("http://unlisted.com"), true);
      });

      it("Should match subdomains of a bare entry", () => {
        setEnvVar("NO_PROXY", "example.com");
        assert.equal(shouldUseProxy("http://sub.example.com"), false);
        assert.equal(shouldUseProxy("http://deep.sub.example.com"), false);
      });

      it("Should match the suffix forms '.example.com' and '*.example.com'", () => {
        setEnvVar("NO_PROXY", ".example.com");
        assert.equal(shouldUseProxy("http://example.com"), false);
        assert.equal(shouldUseProxy("http://sub.example.com"), false);

        setEnvVar("NO_PROXY", "*.other.com");
        assert.equal(shouldUseProxy("http://other.com"), false);
        assert.equal(shouldUseProxy("http://sub.other.com"), false);
      });

      it("Should not match a hostname that merely ends with the entry", () => {
        setEnvVar("NO_PROXY", "example.com");
        assert.equal(shouldUseProxy("http://notexample.com"), true);
      });

      it("Should match case-insensitively", () => {
        setEnvVar("NO_PROXY", "EXAMPLE.com");
        assert.equal(shouldUseProxy("http://Example.COM"), false);
      });

      it("Should restrict an entry with a port to that port", () => {
        setEnvVar("NO_PROXY", "example.com:8080");
        assert.equal(shouldUseProxy("http://example.com:8080"), false);
        assert.equal(shouldUseProxy("http://example.com:9999"), true);
      });

      it("Should compare a ported entry against the protocol's default port", () => {
        setEnvVar("NO_PROXY", "example.com:443,other.com:80");
        assert.equal(shouldUseProxy("https://example.com"), false);
        assert.equal(shouldUseProxy("http://example.com"), true);
        assert.equal(shouldUseProxy("http://other.com"), false);
      });

      it("Should let a portless entry match every port", () => {
        setEnvVar("NO_PROXY", "example.com");
        assert.equal(shouldUseProxy("http://example.com"), false);
        assert.equal(shouldUseProxy("http://example.com:9999"), false);
      });

      it("Should not support CIDR ranges", () => {
        setEnvVar("NO_PROXY", "10.0.0.0/8");
        assert.equal(shouldUseProxy("http://10.1.2.3"), true);
      });

      // A url carries an IPv6 literal in brackets, but an entry is commonly
      // written without them, so both spellings have to match.
      it("Should match an IPv6 host written with or without brackets", () => {
        const url = "http://[2001:db8::1]:8080";

        setEnvVar("NO_PROXY", "[2001:db8::1]");
        assert.equal(shouldUseProxy(url), false);

        setEnvVar("NO_PROXY", "2001:db8::1");
        assert.equal(shouldUseProxy(url), false);
      });

      it("Should not read the tail of a bare IPv6 entry as a port", () => {
        // `2001:db8::1` ends in `:1`, which must not restrict the entry to
        // port 1 and leave `2001:db8:` as the host.
        setEnvVar("NO_PROXY", "2001:db8::1");
        assert.equal(shouldUseProxy("http://[2001:db8::1]"), false);
        assert.equal(shouldUseProxy("http://[2001:db8::2]"), true);
      });

      it("Should restrict a bracketed IPv6 entry with a port to that port", () => {
        setEnvVar("NO_PROXY", "[2001:db8::1]:8080");
        assert.equal(shouldUseProxy("http://[2001:db8::1]:8080"), false);
        assert.equal(shouldUseProxy("http://[2001:db8::1]:9999"), true);
      });

      // A malformed entry should read as a hostname that matches nothing, not
      // bring down every request the process makes.
      it("Should ignore malformed entries without throwing", () => {
        const malformed = [
          ":",
          "::",
          ".",
          "*.",
          ":8080",
          "example.com:",
          "example.com:-1",
          "[",
          "[::1",
          "%zz",
          "a:b",
          "-",
          ",,,,",
        ];

        for (const entry of malformed) {
          setEnvVar("NO_PROXY", entry);

          assert.equal(
            shouldUseProxy("https://example.com"),
            true,
            `Expected NO_PROXY=${JSON.stringify(entry)} not to exclude example.com`,
          );
        }
      });
    });
  });

  describe("isValidUrl", () => {
    it("should return true for a valid URL", () => {
      assert.equal(isValidUrl("http://example.com"), true);
      assert.equal(isValidUrl("https://example.com"), true);
      assert.equal(isValidUrl("ftp://example.com"), true);
      assert.equal(isValidUrl("http://example.com:8080"), true);
      assert.equal(
        isValidUrl("http://example.com/path?name=value#fragment"),
        true,
      );
    });

    it("should return false for an invalid URL", () => {
      assert.equal(isValidUrl("example.com"), false);
      assert.equal(isValidUrl("example"), false);
      assert.equal(isValidUrl(""), false);
      assert.equal(isValidUrl("/relative/path"), false);
    });
  });

  describe("getProxyUrl", () => {
    const { setEnvVar, unsetEnvVar } = createTestEnvManager();

    // These tests are about which variable wins, and most of them set only
    // some of the four. A proxy configured in the environment running the
    // tests would otherwise fill in the rest.
    beforeEach(() => {
      for (const name of [
        "https_proxy",
        "HTTPS_PROXY",
        "http_proxy",
        "HTTP_PROXY",
      ]) {
        unsetEnvVar(name);
      }
    });

    describe("HTTPS URLs", () => {
      it("Should return https_proxy for HTTPS URLs", () => {
        setEnvVar("https_proxy", "http://https-proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com"),
          "http://https-proxy:8080",
        );
      });

      it("Should return HTTPS_PROXY for HTTPS URLs if https_proxy is not set", () => {
        setEnvVar("HTTPS_PROXY", "http://HTTPS-proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com"),
          "http://HTTPS-proxy:8080",
        );
      });

      it("Should fallback to http_proxy for HTTPS URLs if https proxies are not set", () => {
        setEnvVar("http_proxy", "http://http-proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com"),
          "http://http-proxy:8080",
        );
      });

      it("Should fallback to HTTP_PROXY for HTTPS URLs if other proxies are not set", () => {
        setEnvVar("HTTP_PROXY", "http://HTTP-proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com"),
          "http://HTTP-proxy:8080",
        );
      });
    });

    describe("HTTP URLs", () => {
      it("Should return http_proxy for HTTP URLs", () => {
        setEnvVar("http_proxy", "http://http-proxy:8080");
        assert.equal(
          getProxyUrl("http://example.com"),
          "http://http-proxy:8080",
        );
      });

      it("Should return HTTP_PROXY for HTTP URLs if http_proxy is not set", () => {
        setEnvVar("HTTP_PROXY", "http://HTTP-proxy:8080");
        assert.equal(
          getProxyUrl("http://example.com"),
          "http://HTTP-proxy:8080",
        );
      });

      it("Should fallback to https_proxy for HTTP URLs if http proxies are not set", () => {
        setEnvVar("https_proxy", "http://https-proxy:8080");
        assert.equal(
          getProxyUrl("http://example.com"),
          "http://https-proxy:8080",
        );
      });

      it("Should fallback to HTTPS_PROXY for HTTP URLs if other proxies are not set", () => {
        setEnvVar("HTTPS_PROXY", "http://HTTPS-proxy:8080");
        assert.equal(
          getProxyUrl("http://example.com"),
          "http://HTTPS-proxy:8080",
        );
      });
    });

    describe("Other protocols", () => {
      it("Should return undefined for FTP URLs", () => {
        setEnvVar("http_proxy", "http://proxy:8080");
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(getProxyUrl("ftp://example.com"), undefined);
      });

      it("Should return undefined for file URLs", () => {
        setEnvVar("http_proxy", "http://proxy:8080");
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(getProxyUrl("file:///path/to/file"), undefined);
      });

      it("Should return undefined for custom protocols", () => {
        setEnvVar("http_proxy", "http://proxy:8080");
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(getProxyUrl("custom://example.com"), undefined);
      });
    });

    describe("No proxy environment variables", () => {
      it("Should return undefined when no proxy environment variables are set", () => {
        assert.equal(getProxyUrl("https://example.com"), undefined);
        assert.equal(getProxyUrl("http://example.com"), undefined);
      });
    });

    describe("Empty and padded values", () => {
      // Setting a variable to an empty string is how a proxy inherited from a
      // parent environment is disabled, so it has to read as unset. Otherwise
      // it would reach `new ProxyAgent({ uri: "" })`.
      it("Should treat an empty value as unset", () => {
        setEnvVar("https_proxy", "");
        assert.equal(getProxyUrl("https://example.com"), undefined);
      });

      it("Should treat a whitespace-only value as unset", () => {
        setEnvVar("https_proxy", "   ");
        assert.equal(getProxyUrl("https://example.com"), undefined);
      });

      it("Should fall through an empty value to the next variable", () => {
        setEnvVar("http_proxy", "http://fallback:8080");
        setEnvVar("https_proxy", "");
        assert.equal(
          getProxyUrl("https://example.com"),
          "http://fallback:8080",
        );
      });

      it("Should trim the returned value", () => {
        setEnvVar("https_proxy", "  http://proxy:8080  ");
        assert.equal(getProxyUrl("https://example.com"), "http://proxy:8080");
      });
    });

    describe("Priority order", () => {
      it("Should follow correct priority for HTTPS: https_proxy > HTTPS_PROXY > http_proxy > HTTP_PROXY", () => {
        // Set fallback variables first (lowest priority)
        setEnvVar("HTTP_PROXY", "http://4th:8080");

        // On Windows, setting uppercase variables after lowercase variables
        // might overwrite them due to case-insensitivity. So we test the
        // priority order by adding variables in reverse order and testing at each step
        assert.equal(getProxyUrl("https://example.com"), "http://4th:8080");

        setEnvVar("http_proxy", "http://3rd:8080");

        assert.equal(getProxyUrl("https://example.com"), "http://3rd:8080");

        setEnvVar("HTTPS_PROXY", "http://2nd:8080");

        assert.equal(getProxyUrl("https://example.com"), "http://2nd:8080");

        setEnvVar("https_proxy", "http://1st:8080");

        assert.equal(getProxyUrl("https://example.com"), "http://1st:8080");
      });

      it("Should follow correct priority for HTTP: http_proxy > HTTP_PROXY > https_proxy > HTTPS_PROXY", () => {
        // Set fallback variables first (lowest priority)
        setEnvVar("HTTPS_PROXY", "http://4th:8080");

        // On Windows, setting uppercase variables after lowercase variables
        // might overwrite them due to case-insensitivity. So we test the
        // priority order by adding variables in reverse order and testing at each step
        assert.equal(getProxyUrl("http://example.com"), "http://4th:8080");

        setEnvVar("https_proxy", "http://3rd:8080");

        assert.equal(getProxyUrl("http://example.com"), "http://3rd:8080");

        setEnvVar("HTTP_PROXY", "http://2nd:8080");

        assert.equal(getProxyUrl("http://example.com"), "http://2nd:8080");

        setEnvVar("http_proxy", "http://1st:8080");

        assert.equal(getProxyUrl("http://example.com"), "http://1st:8080");
      });
    });

    describe("URL parsing", () => {
      it("Should handle URLs with ports", () => {
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com:9000"),
          "http://proxy:8080",
        );
      });

      it("Should handle URLs with paths", () => {
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com/path/to/resource"),
          "http://proxy:8080",
        );
      });

      it("Should handle URLs with query parameters", () => {
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com?param=value"),
          "http://proxy:8080",
        );
      });

      it("Should handle URLs with fragments", () => {
        setEnvVar("https_proxy", "http://proxy:8080");
        assert.equal(
          getProxyUrl("https://example.com#fragment"),
          "http://proxy:8080",
        );
      });
    });
  });
});
