import { Subject, Observable, Observer, Subscription, BehaviorSubject } from 'rxjs';
import { take, takeUntil, filter } from 'rxjs/operators';
import { TextEncoder, TextDecoder } from 'text-encoding-shim';
import { ReadableStreamDefaultReader } from 'whatwg-streams';
import { ReadableStream } from '@mattiasbuelens/web-streams-polyfill/ponyfill';

import {
  FetchBehavior,
  HttpRequestHeaders,
  HttpRequestOptions,
  HttpRequestState,
  BasicResponse,
  HttpConnection,
} from './types';

export class HttpRequest<T> {
  private simpleConnection: HttpConnection<T> = null;
  private streamConnection: HttpConnection<T> = null;

  private defaultRequestOptions: HttpRequestOptions = {
    headers: {
      'Content-Type': 'application/json'
    }

  }

  constructor(
    private url: string,
    private options: HttpRequestOptions
  ) { }

  public send(
    fetchBehavior: FetchBehavior
  ): Observable<T> {
    const abortController: AbortController = new AbortController();
    if (fetchBehavior === FetchBehavior.stream) {
      if (this.streamConnection !== null) {
        this.streamConnection.fetchAbort.abort();
      }

    } else {
      if (this.simpleConnection !== null) {
        this.simpleConnection.fetchAbort.abort();
      }

    }

    const info: HttpConnection<T> = {
      fetchAbort: abortController,
      observable: this.requestObservable(fetchBehavior, abortController)
    }

    if (fetchBehavior === FetchBehavior.stream) {
      this.streamConnection = info;
      return this.streamConnection.observable;
    } else {
      this.simpleConnection = info;
      return this.simpleConnection.observable;
    }

  }

  public reconfigure(url: string, options: HttpRequestOptions = {}) {
    this.url = url;
    this.options = options;
  }

  private simpleHandler(httpFetch: Promise<any>, observer: Observer<T>): Promise<any> {
    return httpFetch
      .then(response => observer.next(response.json()))
  }

  private streamHandler(httpFetch: Promise<any>, observer: Observer<T>): Promise<any> {
    return httpFetch.then(
      (httpConnection) => {
        return this.readableStream(
          httpConnection.body.getReader(),
          observer
        );
      }
    ).then(
      stream => stream
    )

  }

  private requestObservable(fetchBehavior: FetchBehavior, fetchAbort: AbortController): Observable<T> {
    const cleanUp: Subject<boolean> = new BehaviorSubject(false);
    const observable = Observable
      .create((observer: Observer<T>) => {
        const httpFetch = fetch(
          this.url,
          Object.assign(
            Object.assign(
              this.defaultRequestOptions, {
                signal: fetchAbort.signal
              }

            ), this.options
          )
        );

        let behavior: Promise<any>;
        switch (fetchBehavior) {
          case FetchBehavior.stream: behavior = this.streamHandler(httpFetch, observer); break;
          default: behavior = this.simpleHandler(httpFetch, observer); break;
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

      });

    return observable
      .pipe(takeUntil(cleanUp));
  }

  private readableStream(
    reader: ReadableStreamDefaultReader,
    observer: Observer<T>
  ): ReadableStream {
    return new ReadableStream({
      start: (controller: any) => {
        return next();
        function next(): any {
          return reader.read().then(({ done, value }: any) => {
            if (done) {
              controller.close();
              observer.complete();
              return;
            }

            controller.enqueue(value);
            let decodedValue: string;

            try {
              decodedValue = new TextDecoder('utf-8').decode(value);

              try {
                observer.next(JSON.parse(decodedValue));

              } catch {
                console.error('decoded response not json', decodedValue);
              }

            } catch {
              console.error('response not utf-8');
            }

            return next();
          })

        }

      },

      cancel: () => {
        console.log('stream cancelled');
      }

    })

  }

}
