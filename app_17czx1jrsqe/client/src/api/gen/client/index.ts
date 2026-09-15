// @ts-nocheck
export type { Auth } from './client-core/auth';
export type { QuerySerializerOptions } from './client-core/bodySerializer';
export {
  formDataBodySerializer,
  jsonBodySerializer,
  urlSearchParamsBodySerializer,
} from './client-core/bodySerializer';
export { buildClientParams } from './client-core/params';
export { serializeQueryKeyValue } from './client-core/queryKeySerializer';
export { createClient } from './client';
export type {
  Client,
  ClientOptions,
  Config,
  CreateClientConfig,
  Options,
  RequestOptions,
  RequestResult,
  TDataShape,
  UnifiedError,
} from './types';
export { createConfig } from './utils';
