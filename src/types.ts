import { RxHttpObservable } from './rxhttpobservable';
import { Observable, Subject } from 'rxjs';

export interface HttpRequestState {
  messages: string[];
}

export type HttpRequestHeaders = {
} & {
  [prop: string]: string;
}

export type HttpConnection<T> = {
  fetchAbort: AbortController;
  observable: Observable<T>;
} | null

export interface HttpRequestOptions {
  headers?: HttpRequestHeaders;
  method?: string;
  body?: string;
  retry?: boolean;
}

export interface BasicResponse {
  body: any;
}

export enum FetchBehavior {
  stream = 'stream',
  simple = 'simple'
}

