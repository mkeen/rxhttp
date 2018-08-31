import { Observable, Observer, Subscription, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { TextEncoder, TextDecoder } from 'text-encoding-shim';
import { ReadableStreamDefaultReader } from 'whatwg-streams';
import { ReadableStream } from '@mattiasbuelens/web-streams-polyfill/ponyfill';

import {
  FetchBehavior,
  HttpRequestHeaders,
  HttpRequestOptions
} from './types';

export class HttpRequest<T> {
  private abortController: AbortController = new AbortController();
  private observer: Observer<T> | null = null;
  private observable: Observable<T> = Observable
    .create((observer: Observer<T>) => {
      this.observer = observer;
    });

  private defaultRequestOptions: HttpRequestOptions = {
    headers: {
      'Content-Type': 'application/json'
    }

  }

  constructor(
    private url: string,
    private options: HttpRequestOptions,
    private behavior: FetchBehavior = FetchBehavior.simple
  ) { }

  public cancel(): void {
    this.disconnect();
    if (this.observer) {
      this.observer.complete();
      this.observer = null;
      this.observable = Observable
        .create((observer: Observer<T>) => {
          this.observer = observer;
        });
    }

  }

  public disconnect(): void {
    if (this.abortController !== null) {
      this.abortController.abort();
      this.abortController = new AbortController();
    }

  }

  public reconfigure(
    url: string,
    options?: HttpRequestOptions,
    behavior?: FetchBehavior
  ) {
    if (behavior) {
      this.behavior = behavior;
    }

    this.url = url;

    if (options) {
      this.options = options;
    }

    this.send();
  }

  public send(
    fetchBehavior: FetchBehavior = FetchBehavior.simple
  ): Observable<T> {
    return this.fetch();
  }

  private fetch(): Observable<T> {
    this.disconnect();
    const cleanUp: Subject<boolean> = new Subject();
    const httpFetch = fetch(
      this.url,
      Object.assign(
        Object.assign(
          this.defaultRequestOptions, {
            signal: this.abortController.signal
          }

        ), this.options
      )

    );

    let behavior: Promise<any>;
    switch (this.behavior) {
      case FetchBehavior.stream: behavior = this.streamHandler(httpFetch); break;
      default: behavior = this.simpleHandler(httpFetch); break;
    }

    behavior
      .catch(
        (exception) => {
          if (exception instanceof DOMException) {
            console.error(exception);
            cleanUp.next(true);
          } else {
            console.error('unknown error');
            cleanUp.next(true);
          }

        }

      );

    return this.observable
      .pipe(takeUntil(cleanUp));
  }

  private simpleHandler(httpFetch: Promise<any>): Promise<any> {
    return httpFetch
      .then(response => response.json())
      .then(response => (<Observer<T>>this.observer).next(response))
  }

  private streamHandler(httpFetch: Promise<any>): Promise<any> {
    return httpFetch.then(
      (httpConnection) => {
        return this.readableStream(
          httpConnection.body.getReader(),
          <Observer<T>>this.observer
        );

      }

    ).then(
      stream => stream
    );

  }

  private readableStream(
    reader: ReadableStreamDefaultReader,
    observer: Observer<T>
  ): ReadableStream {
    return new ReadableStream({
      start: (controller: any) => {
        return next();
        function next(): any {
          const decoder = new TextDecoder('utf-8');

          return reader
            .read()
            .then(
              ({ done,
                value }: any) => {
                if (done) {
                  controller.close();
                  observer.complete();
                  return;
                }

                controller.enqueue(value);
                try {
                  const decodedValue: string = decoder.decode(value);
                  try {
                    observer.next(JSON.parse(decodedValue));
                  } catch {
                    console.error('decoded response not json', decodedValue);
                  }

                } catch {
                  console.error('response not utf-8');
                }

                return next();
              }

            );

        }

      },

      cancel: () => {
        console.log('stream cancelled');
      }

    });

  }

}
