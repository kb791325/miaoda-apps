// @ts-nocheck
import type { AxiosError, AxiosInstance, RawAxiosRequestHeaders } from 'axios';
import axios from 'axios';

import { createSseClient } from './client-core/serverSentEvents';
import type { HttpMethod } from './client-core/types';
import { getValidRequestBody } from './client-core/utils';
import type { Client, Config, RequestOptions } from './types';
import {
  buildUrl,
  createConfig,
  mergeConfigs,
  mergeHeaders,
  setAuthParams,
  captureStack,
  transformToUnifiedError,
} from './utils';

export const createClient = (config: Config = {}): Client => {
  let _config = mergeConfigs(createConfig({
    throwOnError: false, // 默认不抛出异常，返回 response.error
  }), config);
  const instance: AxiosInstance = axios; // 默认使用全局 Axios 实例
  const enableStackTrace = process.env.NODE_ENV !== 'production'; // 非生产环境开启堆栈跟踪

  const getConfig = (): Config => ({ ..._config });

  const setConfig = (config: Config): Config => {
    _config = mergeConfigs(_config, config);
    instance.defaults = {
      ...instance.defaults,
      ..._config,
      // @ts-expect-error
      headers: mergeHeaders(instance.defaults.headers, _config.headers),
    };
    return getConfig();
  };

  const beforeRequest = async (options: RequestOptions) => {
    const opts = {
      ..._config,
      ...options,
      axios: options.axios ?? _config.axios ?? instance,
      headers: mergeHeaders(_config.headers, options.headers),
    };

    if (opts.security) {
      await setAuthParams({
        ...opts,
        security: opts.security,
      });
    }

    if (opts.requestValidator) {
      await opts.requestValidator(opts);
    }

    if (opts.body !== undefined && opts.bodySerializer) {
      opts.body = opts.bodySerializer(opts.body);
    }

    const url = buildUrl(opts);

    return { opts, url };
  };

  // @ts-expect-error
  const request: Client['request'] = async (options) => {
    // @ts-expect-error
    const { opts, url } = await beforeRequest(options);
    try {
      // assign Axios here for consistency with fetch
      const _axios = opts.axios!;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { auth, ...optsWithoutAuth } = opts;
      // @ts-expect-error custom _stacktrace property
      const response = await _axios({
        ...optsWithoutAuth,
        baseURL: '', // the baseURL is already included in `url`
        data: getValidRequestBody(opts),
        headers: opts.headers as RawAxiosRequestHeaders,
        // let `paramsSerializer()` handle query params if it exists
        params: opts.paramsSerializer ? opts.query : undefined,
        url,
        _stacktrace: enableStackTrace ? captureStack() : undefined,
      });

      let { data } = response;

      const isJsonResponseType = response.headers['content-type']?.includes('application/json');
      if (isJsonResponseType || opts.responseType === 'json') {
        if (opts.responseValidator) {
          await opts.responseValidator(data);
        }

        if (opts.responseTransformer) {
          data = await opts.responseTransformer(data);
        }
      }

      return {
        ...response,
        data: data ?? {},
      };
    } catch (error) {
      const e = error as AxiosError;
      // 统一转换错误格式
      const unifiedError = transformToUnifiedError(e);
      // @ts-expect-error - 添加统一错误到 AxiosError 对象
      e.error = unifiedError;
      if (opts.throwOnError) {
        throw e;
      }
      return e;
    }
  };

  const makeMethodFn =
    (method: Uppercase<HttpMethod>) => (options: RequestOptions) =>
      request({ ...options, method });

  const makeSseFn =
    (method: Uppercase<HttpMethod>) => async (options: RequestOptions) => {
      const { opts, url } = await beforeRequest(options);
      return createSseClient({
        ...opts,
        body: opts.body as any,
        headers: opts.headers as Record<string, string>,
        method,
        // @ts-expect-error
        signal: opts.signal,
        url,
      });
    };

  return {
    buildUrl,
    connect: makeMethodFn('CONNECT'),
    delete: makeMethodFn('DELETE'),
    get: makeMethodFn('GET'),
    getConfig,
    head: makeMethodFn('HEAD'),
    instance,
    options: makeMethodFn('OPTIONS'),
    patch: makeMethodFn('PATCH'),
    post: makeMethodFn('POST'),
    put: makeMethodFn('PUT'),
    request,
    setConfig,
    sse: {
      connect: makeSseFn('CONNECT'),
      delete: makeSseFn('DELETE'),
      get: makeSseFn('GET'),
      head: makeSseFn('HEAD'),
      options: makeSseFn('OPTIONS'),
      patch: makeSseFn('PATCH'),
      post: makeSseFn('POST'),
      put: makeSseFn('PUT'),
      trace: makeSseFn('TRACE'),
    },
    trace: makeMethodFn('TRACE'),
  } as Client;
};
