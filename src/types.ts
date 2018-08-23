export interface HttpRequestState {
  messages: string[];
}

export interface HttpRequestHeaders {
  'Content-Type': string;
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
