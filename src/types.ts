export interface HttpRequestState {
  messages: string[];
}

export type HttpRequestHeaders = {
} & {
  [prop: string]: string;
}

export interface HttpRequestOptions {
  headers?: HttpRequestHeaders;
  method?: string;
  body?: string;
  retry?: boolean;
}

export interface BasicResponse {
  body: any;
}
