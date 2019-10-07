/**
 * HTTP request headers type. Only constraints are that keys and values are
 * both strings.
 */
export type HttpRequestHeaders = {} & {
  [prop: string]: string;
}

/**
 * Cookie  type. Only constraints are that keys and values are both strings.
 */
export type HttpSessionCookies = {} & {
  [prop: string]: string;
}

/**
 * Configuration for HttpRequest
 */
export interface HttpRequestOptions {
  headers?: HttpRequestHeaders;
  method?: string;
  body?: string;
  retry?: boolean;
  credentials?: string;
  referrer?: string;
  referrerPolicy?: string;
}

export interface HttpResponseWithHeaders<T> {
  headers: Headers;
  response: T;
}

export interface ServerErrorResponse {
  errorCode: number;
  errorMessage: any;
}

export enum FetchBehavior {
  stream = 'stream',
  simple = 'simple',
  simpleWithHeaders = 'simpleWithHeaders'
}

export enum FetchError {
  connectionRefused = 'connectionRefused'
}
