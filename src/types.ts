import { Observable } from 'rxjs';

/**
 * Custom Object type that will be sent in request header
 */
export type HttpRequestHeaders = {} & {
  [prop: string]: string;
}

/**
 * HttpRequestOptions interface that will be used in custom request options.
 */
export interface HttpRequestOptions {
  /**
   * `headers` Custom Header to be sent.
   */
  headers?: HttpRequestHeaders;
  /**
   * `method` request method to be used.
   */
  method?: string;
  /**
   * `body` is the data to be sent as the request body.
   */
  body?: string;
  /**
   * `retry` Cooming soon.
   */
  retry?: boolean;
}

/**
  * FetchBehavior enum that you can choose for real-time JSON streams or simple request.
  */
export enum FetchBehavior {
  /**
   * Real-time JSON streams option.
   */
  stream = 'stream',
  /**
   * Simple request option.
   */
  simple = 'simple'
}
