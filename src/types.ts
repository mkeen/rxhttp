import { Observable } from 'rxjs';

export type HttpRequestHeaders = {} & {
  [prop: string]: string;
}

export interface HttpRequestOptions {
  headers?: HttpRequestHeaders;
  method?: string;
  body?: string;
  retry?: boolean;
}

export enum FetchBehavior {
  stream = 'stream',
  simple = 'simple'
}

