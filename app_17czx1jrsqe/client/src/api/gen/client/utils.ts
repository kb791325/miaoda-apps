// @ts-nocheck
import type { AxiosError } from 'axios';
import { getAuthToken } from './client-core/auth';
import type { QuerySerializerOptions } from './client-core/bodySerializer';
import {
  serializeArrayParam,
  serializeObjectParam,
  serializePrimitiveParam,
} from './client-core/pathSerializer';
import { getUrl } from './client-core/utils';
import type { Client, ClientOptions, Config, RequestOptions, UnifiedError } from './types';

export const createQuerySerializer = <T = unknown>({
  parameters = {},
  ...args
}: QuerySerializerOptions = {}) => {
  const querySerializer = (queryParams: T) => {
    const search: string[] = [];
    if (queryParams && typeof queryParams === 'object') {
      for (const name in queryParams) {
        const value = queryParams[name];

        if (value === undefined || value === null) {
          continue;
        }

        const options = parameters[name] || args;

        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam({
            allowReserved: options.allowReserved,
            explode: true,
            name,
            style: 'form',
            value,
            ...options.array,
          });
          if (serializedArray) search.push(serializedArray);
        } else if (typeof value === 'object') {
          const serializedObject = serializeObjectParam({
            allowReserved: options.allowReserved,
            explode: true,
            name,
            style: 'deepObject',
            value: value as Record<string, unknown>,
            ...options.object,
          });
          if (serializedObject) search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam({
            allowReserved: options.allowReserved,
            name,
            value: value as string,
          });
          if (serializedPrimitive) search.push(serializedPrimitive);
        }
      }
    }
    return search.join('&');
  };
  return querySerializer;
};

const checkForExistence = (
  options: Pick<RequestOptions, 'auth' | 'query'> & {
    headers: Record<any, unknown>;
  },
  name?: string,
): boolean => {
  if (!name) {
    return false;
  }
  if (name in options.headers || options.query?.[name]) {
    return true;
  }
  if (
    'Cookie' in options.headers &&
    options.headers['Cookie'] &&
    typeof options.headers['Cookie'] === 'string'
  ) {
    return options.headers['Cookie'].includes(`${name}=`);
  }
  return false;
};

export const setAuthParams = async ({
  security,
  ...options
}: Pick<Required<RequestOptions>, 'security'> &
  Pick<RequestOptions, 'auth' | 'query'> & {
    headers: Record<any, unknown>;
  }) => {
  for (const auth of security) {
    if (checkForExistence(options, auth.name)) {
      continue;
    }
    const token = await getAuthToken(auth, options.auth);

    if (!token) {
      continue;
    }

    const name = auth.name ?? 'Authorization';

    switch (auth.in) {
      case 'query':
        if (!options.query) {
          options.query = {};
        }
        options.query[name] = token;
        break;
      case 'cookie': {
        const value = `${name}=${token}`;
        if ('Cookie' in options.headers && options.headers['Cookie']) {
          options.headers['Cookie'] = `${options.headers['Cookie']}; ${value}`;
        } else {
          options.headers['Cookie'] = value;
        }
        break;
      }
      case 'header':
      default:
        options.headers[name] = token;
        break;
    }
  }
};

export const buildUrl: Client['buildUrl'] = (options) => {
  const instanceBaseUrl = options.axios?.defaults?.baseURL;

  const baseUrl =
    !!options.baseURL && typeof options.baseURL === 'string'
      ? options.baseURL
      : instanceBaseUrl;

  return getUrl({
    baseUrl: baseUrl as string,
    path: options.path,
    // let `paramsSerializer()` handle query params if it exists
    query: !options.paramsSerializer ? options.query : undefined,
    querySerializer:
      typeof options.querySerializer === 'function'
        ? options.querySerializer
        : createQuerySerializer(options.querySerializer),
    url: options.url,
  });
};

export const mergeConfigs = (a: Config, b: Config): Config => {
  const config = { ...a, ...b };
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};

/**
 * Special Axios headers keywords allowing to set headers by request method.
 */
export const axiosHeadersKeywords = [
  'common',
  'delete',
  'get',
  'head',
  'patch',
  'post',
  'put',
] as const;

export const mergeHeaders = (
  ...headers: Array<Required<Config>['headers'] | undefined>
): Record<any, unknown> => {
  const mergedHeaders: Record<any, unknown> = {};
  for (const header of headers) {
    if (!header || typeof header !== 'object') {
      continue;
    }

    const iterator = Object.entries(header);

    for (const [key, value] of iterator) {
      if (
        axiosHeadersKeywords.includes(
          key as (typeof axiosHeadersKeywords)[number],
        ) &&
        typeof value === 'object'
      ) {
        mergedHeaders[key] = {
          ...(mergedHeaders[key] as Record<any, unknown>),
          ...value,
        };
      } else if (value === null) {
        delete mergedHeaders[key];
      } else if (Array.isArray(value)) {
        for (const v of value) {
          // @ts-expect-error
          mergedHeaders[key] = [...(mergedHeaders[key] ?? []), v as string];
        }
      } else if (value !== undefined) {
        // assume object headers are meant to be JSON stringified, i.e. their
        // content value in OpenAPI specification is 'application/json'
        mergedHeaders[key] =
          typeof value === 'object' ? JSON.stringify(value) : (value as string);
      }
    }
  }
  return mergedHeaders;
};

export const createConfig = <T extends ClientOptions = ClientOptions>(
  override: Config<Omit<ClientOptions, keyof T> & T> = {},
): Config<Omit<ClientOptions, keyof T> & T> => ({
  ...override,
});

/**
 * Captures the stack trace of the current function call.
 *
 * @returns The stack trace as a string, or undefined if not available.
 */
export const captureStack = (): string | undefined => {
  const obj: { stack?: string } = {};
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(obj, captureStack);
    return obj.stack;
  }
  return new Error().stack;
}

/**
 * Axios 错误码到统一错误码的映射
 */
const AXIOS_ERROR_CODE_MAP: Record<string, { code: string; message: string }> = {
  ECONNABORTED: { code: 'TIMEOUT', message: '请求超时' },
  ERR_NETWORK: { code: 'NETWORK_ERROR', message: '网络连接失败' },
  ERR_CANCELED: { code: 'CANCELED', message: '请求已取消' },
  ERR_BAD_REQUEST: { code: 'BAD_REQUEST', message: '请求错误' },
  ERR_BAD_RESPONSE: { code: 'SERVER_ERROR', message: '服务器响应错误' },
  ETIMEDOUT: { code: 'TIMEOUT', message: '连接超时' },
  ENOTFOUND: { code: 'NETWORK_ERROR', message: '无法连接到服务器' },
};

/**
 * 将 AxiosError 转换为统一错误格式
 */
export function transformToUnifiedError(error: AxiosError): UnifiedError {
  const timestamp = Date.now();

  // 情况1: 有服务器响应（HTTP 错误）
  if (error.response) {
    const responseData = error.response.data as any;
    const serverError = responseData?.error;

    if (serverError) {
      // 后端返回了标准错误格式 { error: { code, message, ... } }
      return {
        code: serverError.code || 'UNKNOWN_ERROR',
        message: serverError.message || '未知错误',
        httpStatus: error.response.status,
        details: serverError.details,
        fieldErrors: serverError.fieldErrors,
        stack: serverError.stack,
        isNetworkError: false,
        timestamp: serverError.timestamp || timestamp,
      };
    }

    // 后端返回了非标准格式
    return {
      code: `HTTP_${error.response.status}`,
      message: responseData?.message || error.message || '请求失败',
      httpStatus: error.response.status,
      details: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
      isNetworkError: false,
      timestamp,
    };
  }

  // 情况2: 无服务器响应（网络层错误）
  const axiosCode = error.code || 'UNKNOWN';
  const mappedError = AXIOS_ERROR_CODE_MAP[axiosCode];

  return {
    code: mappedError?.code || axiosCode,
    message: mappedError?.message || error.message || '请求失败',
    isNetworkError: true,
    timestamp,
  };
}
