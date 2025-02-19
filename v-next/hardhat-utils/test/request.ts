import type UndiciT from "undici";

import assert from "node:assert/strict";
import path from "node:path";
import querystring from "node:querystring";
import { afterEach, describe, it } from "node:test";

import { expectTypeOf } from "expect-type";
import { ProxyAgent, Pool, Agent, Client } from "undici";

import { ensureError } from "../src/error.js";
import { exists, readUtf8File } from "../src/fs.js";
import {
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
} from "../src/request.js";

import { useTmpDir } from "./helpers/fs.js";
import { initializeTestDispatcher } from "./helpers/request.js";

describe("Requests util", () => {
  describe("getDispatcher", () => {
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

    describe("getBaseDispatcherOptions", () => {
      it("Should return the default options if no options are passed", () => {
        const expectedOptions = {
          headersTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          bodyTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          connectTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          maxRedirections: DEFAULT_MAX_REDIRECTS,
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
          maxRedirections: DEFAULT_MAX_REDIRECTS,
        };
        const options = getBaseDispatcherOptions(timeout);

        assert.deepEqual(options, expectedOptions);
      });

      it("Should return the options with the provided keepAliveTimeouts for tests", () => {
        const expectedOptions = {
          headersTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          bodyTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          connectTimeout: DEFAULT_TIMEOUT_IN_MILLISECONDS,
          maxRedirections: DEFAULT_MAX_REDIRECTS,
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
          maxRedirections: DEFAULT_MAX_REDIRECTS,
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
        throwOnError: true,
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

    it("Should return the provided dispatcher", async () => {
      const url = "http://localhost";
      const dispatcher = new Client(url);
      const { dispatcher: returnedDispatcher } = await getBaseRequestOptions(
        url,
        {},
        dispatcher,
      );

      assert.equal(dispatcher, returnedDispatcher);
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
    const interceptor = await initializeTestDispatcher();
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
      const response = await getRequest(url, undefined, interceptor);

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
      const response = await getRequest(url, { queryParams }, interceptor);

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
      const response = await getRequest(url, { extraHeaders }, interceptor);

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
        interceptor,
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

      await assert.rejects(getRequest(url, undefined, interceptor), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });
  });

  describe("postJsonRequest", async () => {
    const interceptor = await initializeTestDispatcher();
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
      const response = await postJsonRequest(url, body, undefined, interceptor);

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
        interceptor,
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
        interceptor,
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
        interceptor,
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

      await assert.rejects(postJsonRequest(url, body, undefined, interceptor), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });
  });

  describe("postFormRequest", async () => {
    const interceptor = await initializeTestDispatcher();
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
      const response = await postFormRequest(url, body, undefined, interceptor);

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
        interceptor,
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
        interceptor,
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
        interceptor,
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

      await assert.rejects(postFormRequest(url, body, undefined, interceptor), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });
  });

  describe("download", async () => {
    const interceptor = await initializeTestDispatcher();
    const getTmpDir = useTmpDir("request");
    const url = "http://localhost";
    const baseInterceptorOptions = {
      path: "/",
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };

    it("Should download a file", async () => {
      const destination = path.join(getTmpDir(), "file.txt");
      interceptor.intercept(baseInterceptorOptions).reply(200, "file content");
      await download(url, destination, undefined, interceptor);

      assert.ok(await exists(destination), "Should create the file");
      assert.equal(await readUtf8File(destination), "file content");
    });

    it("Should throw if the request fails", async () => {
      const destination = path.join(getTmpDir(), "file.txt");
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      await assert.rejects(download(url, destination, undefined, interceptor), {
        name: "ResponseStatusCodeError",
        message: `Received an unexpected status code from ${url}`,
      });
    });
  });

  describe("shouldUseProxy", () => {
    afterEach(() => {
      delete process.env.NO_PROXY;
    });

    it("Should return false for localhost", () => {
      assert.equal(shouldUseProxy("http://localhost"), false);
    });

    it("Should return false for 127.0.0.1", () => {
      assert.equal(shouldUseProxy("http://127.0.0.1"), false);
    });

    it("Should return false if NO_PROXY is '*'", () => {
      process.env.NO_PROXY = "*";
      assert.equal(shouldUseProxy("http://example.com"), false);
    });

    it("Should return false if hostname is in NO_PROXY list", () => {
      process.env.NO_PROXY = "example.com,other.com";
      assert.equal(shouldUseProxy("http://example.com"), false);
      assert.equal(shouldUseProxy("http://other.com"), false);
    });

    it("Should return true if hostname is not in NO_PROXY list", () => {
      process.env.NO_PROXY = "other.com,different.com";
      assert.equal(shouldUseProxy("http://example.com"), true);
    });

    it("Should handle a mix of proxied and non-proxied URLs in NO_PROXY", () => {
      process.env.NO_PROXY = "example.com,other.com";
      assert.equal(shouldUseProxy("http://example.com"), false);
      assert.equal(shouldUseProxy("http://other.com"), false);
      assert.equal(shouldUseProxy("http://different.com"), true);
    });

    it("Should return true if NO_PROXY is not defined", () => {
      assert.equal(shouldUseProxy("http://example.com"), true);
    });

    it("Should ignore the protocol part of the URL", () => {
      process.env.NO_PROXY = "example.com";
      assert.equal(shouldUseProxy("http://example.com"), false);
      assert.equal(shouldUseProxy("https://example.com"), false);
      assert.equal(shouldUseProxy("ftp://example.com"), false);
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
});
