// @ts-nocheck
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestHeaders,
  AxiosResponse,
  AxiosStatic,
  CreateAxiosDefaults,
} from 'axios';

import type { Auth } from './client-core/auth';
import type {
  ServerSentEventsOptions,
  ServerSentEventsResult,
} from './client-core/serverSentEvents';
import type {
  Client as CoreClient,
  Config as CoreConfig,
} from './client-core/types';

export interface Config<T extends ClientOptions = ClientOptions>
  extends Omit<CreateAxiosDefaults, 'auth' | 'baseURL' | 'headers' | 'method'>,
    CoreConfig {
  /**
   * Axios implementation. You can use this option to provide either an
   * `AxiosStatic` or an `AxiosInstance`.
   *
   * @default axios
   */
  axios?: AxiosStatic | AxiosInstance;
  /**
   * Base URL for all requests made by this client.
   */
  baseURL?: T['baseURL'];
  /**
   * An object containing any HTTP headers that you want to pre-populate your
   * `Headers` object with.
   *
   * {@link https://developer.mozilla.org/docs/Web/API/Headers/Headers#init See more}
   */
  headers?:
    | AxiosRequestHeaders
    | Record<
        string,
        | string
        | number
        | boolean
        | (string | number | boolean)[]
        | null
        | undefined
        | unknown
      >;
  /**
   * Throw an error instead of returning it in the response?
   *
   * @default false
   */
  throwOnError?: T['throwOnError'];
}

export interface RequestOptions<
  TData = unknown,
  ThrowOnError extends boolean = boolean,
  Url extends string = string,
> extends Config<{
      throwOnError: ThrowOnError;
    }>,
    Pick<
      ServerSentEventsOptions<TData>,
      | 'onSseError'
      | 'onSseEvent'
      | 'sseDefaultRetryDelay'
      | 'sseMaxRetryAttempts'
      | 'sseMaxRetryDelay'
    > {
  /**
   * Any body that you want to add to your request.
   *
   * {@link https://developer.mozilla.org/docs/Web/API/fetch#body}
   */
  body?: unknown;
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  /**
   * Security mechanism(s) to use for the request.
   */
  security?: ReadonlyArray<Auth>;
  url: Url;
}

export interface ClientOptions {
  baseURL?: string;
  throwOnError?: boolean;
}

export type RequestResult<
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = boolean,
> = ThrowOnError extends true
  ? Promise<
      AxiosResponse<
        TData extends Record<string, unknown> ? TData[keyof TData] : TData
      >
    >
  : Promise<
      | (AxiosResponse<
          TData extends Record<string, unknown> ? TData[keyof TData] : TData
        > & { error?: undefined })
      | (AxiosError & {
          data: undefined;
          error: UnifiedError<TError>;
        })
    >;
type MethodFn = <
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = false,
>(
  options: Omit<RequestOptions<TData, ThrowOnError>, 'method'>,
) => RequestResult<TData, TError, ThrowOnError>;

type SseFn = <
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = false,
>(
  options: Omit<RequestOptions<TData, ThrowOnError>, 'method'>,
) => Promise<ServerSentEventsResult<TData, TError>>;

type RequestFn = <
  TData = unknown,
  TError = unknown,
  ThrowOnError extends boolean = false,
>(
  options: Omit<RequestOptions<TData, ThrowOnError>, 'method'> &
    Pick<Required<RequestOptions<TData, ThrowOnError>>, 'method'>,
) => RequestResult<TData, TError, ThrowOnError>;

type BuildUrlFn = <
  TData extends {
    body?: unknown;
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
    url: string;
  },
>(
  options: TData & Options<TData>,
) => string;

export type Client = CoreClient<
  RequestFn,
  Config,
  MethodFn,
  BuildUrlFn,
  SseFn
> & {
  instance: AxiosInstance;
};

/**
 * The `createClientConfig()` function will be called on client initialization
 * and the returned object will become the client's initial configuration.
 *
 * You may want to initialize your client this way instead of calling
 * `setConfig()`. This is useful for example if you're using Next.js
 * to ensure your client always has the correct values.
 */
export type CreateClientConfig<T extends ClientOptions = ClientOptions> = (
  override?: Config<ClientOptions & T>,
) => Config<Required<ClientOptions> & T>;

export interface TDataShape {
  body?: unknown;
  headers?: unknown;
  path?: unknown;
  query?: unknown;
  url: string;
}

type OmitKeys<T, K> = Pick<T, Exclude<keyof T, K>>;

export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
  TResponse = unknown,
> = OmitKeys<
  RequestOptions<TResponse, ThrowOnError>,
  'body' | 'path' | 'query' | 'url'
> &
  ([TData] extends [never] ? unknown : Omit<TData, 'url'>);

/**
 * 统一错误格式
 */
export interface UnifiedError<T = unknown> {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** HTTP 状态码（如果有） */
  httpStatus?: number;
  /** 详细信息 */
  details?: string;
  /** 字段验证错误 */
  fieldErrors?: Record<string, string[]>;
  /** 错误栈 */
  stack?: string;
  /** 是否是网络层错误（超时、断网等） */
  isNetworkError: boolean;
  /** 错误时间戳 */
  timestamp: number;
  rawError?: T
}