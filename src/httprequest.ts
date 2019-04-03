import { Observable, Observer, Subject, of } from 'rxjs';
import { delay, take, takeUntil } from 'rxjs/operators';
import { merge } from 'lodash';

import {
  FetchBehavior,
  HttpRequestOptions
} from './types';

/**
 * Class for managing an HTTP request. Supports two different behaviors:
 *   - Simple (good ol' fashioned 1:1 request response)
 *   - Stream (Opens a connection and receives a stream of json objects)
 * @param T <T> Expected type of response data
 */
export class HttpRequest<T> {
  private abortController: AbortController = new AbortController();
  private observer: Observer<T> | null = null;
  private observable: Observable<T> = Observable
    .create((observer: Observer<T>) => {
      this.observer = observer;
    });

  /**
   * Any configuration options specified here are un-overridable.
   * JSON is the only supported content-type.
   */
  private defaultRequestOptions: HttpRequestOptions = {
    headers: {
      'Content-Type': 'application/json'
    }

  }

  /**
   * Constructor.
   *
   * @param url Server URL that will be used for the request
   * @param options Configuration options
   * @param behavior Behavior for request (basic, or stream)
   */
  constructor(
    private url: string,
    private options: HttpRequestOptions = {},
    private behavior: FetchBehavior = FetchBehavior.simple
  ) { }

  /**
   * cancel() Cancels the current request
   */
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

  /**
   * disconnnect() Closes an active HTTP stream
   */
  public disconnect(): void {
    if (this.abortController !== null) {
      this.abortController.abort();
      this.abortController = new AbortController();
    }

  }

  /**
   * reconfigure() Request in-flight. Change URL, method, body, headers, ...
   *
   * @param url Server URL that will be used for the request
   * @param options Configuration options
   * @param behavior Behavior for request (basic, or stream)
   */
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

    this.fetch();
  }

  /**
   * fetch() Put the request in motion. Subscribe to return value.
   */
  public fetch(): Observable<T> {
    this.disconnect();
    const cleanUp: Subject<boolean> = new Subject();
    const httpFetch = this._fetch();

    let behavior: Promise<any> =
      this.behavior === FetchBehavior.stream
        ? this.streamHandler(httpFetch)
        : this.simpleHandler(httpFetch);

    behavior
      .catch(exception => {
        of(exception)
          .pipe(
            take(1),
            delay(this.retryTimeDelay())
          ).subscribe(() => {
            this.fetch();
          });

      });

    return this.observable
      .pipe(takeUntil(cleanUp));
  }

  public _fetch(): Promise<Response> {
    return fetch(
      this.url,
      merge(
        merge(
          this.defaultRequestOptions, {
            signal: this.abortController.signal
          }

        ), this.options

      )

    );

  }

  /**
   * retryTimeDelay() Returns a random whole number inside a predetermined range
   * Used to determine how long to delay before a retry. This is to be nice to
   * servers that are under heavy load.
   */
  public retryTimeDelay(): number {
    const range: any = [2500, 10000];
    const delay = Math.random() * (range[1] - range[0]) + range[0];
    return delay;
  }

  /**
   * simpleHandler() Handles a simple HTTP response containing JSON data
   *
   * @param httpFetch Promise to handle
   */
  private simpleHandler(httpFetch: Promise<any>): Promise<any> {
    return httpFetch
      .then(response => response.json())
      .then(response => (<Observer<T>>this.observer).next(response))
  }

  /**
   * streamHandler() Handles a long-lived HTTP stream
   *
   * @param httpFetch Promise to handle
   */
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

  /**
   * readableStream() Returns a preconfigured ReadableStream
   * ReadableStream will decode utf-8 json and send the result to the observer.
   *
   * @param reader
   * @param observer
   */
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
                    console.log('decoded response (ignored) not json ', decodedValue);
                  }

                } catch {
                  console.log('response (ignored) not utf-8 encoded, ' + value);
                }

                return next();
              }

            );

        }

      },

      cancel: () => {
        // I believe this will never be called since managed higher in stack. Need tests.
        console.log('stream cancelled');
      }

    });

  }

}
