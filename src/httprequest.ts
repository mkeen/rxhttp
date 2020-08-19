import { merge } from 'lodash';
import { takeUntil, finalize, map, buffer, tap, take } from 'rxjs/operators';
import { Observable, Observer, Subject, fromEvent } from 'rxjs';

const jsEnv = require('browser-or-node');

import {
  FetchBehavior,
  FetchError,
} from './types';

const nodeFetch = require('node-fetch').default;

let stream: any;

if (!jsEnv.isBrowser) {
  stream = require('stream');
}

/**
 * Class for managing an HTTP request. Supports two different behaviors:
 *   - Simple (good ol' fashioned 1:1 request response)
 *   - Stream (Opens a connection and receives a stream of json objects)
 * @param T <T> Expected type of response data
 */
export class HttpRequest<T> {
  private receivedBytes: boolean = false;
  private abortController: any = jsEnv.isBrowser ? new AbortController() : null;

  private observer: Observer<T> | null = null;
  private observable: Observable<T> = Observable
    .create((observer: Observer<T>) => {
      this.observer = observer;
    });

  /**
   * Any configuration options specified here are un-overridable.
   * JSON is the only supported content-type.
   */
  private defaultRequestOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },

    credentials: 'include'
  }

  private jsonStrBuffer: string = '';

  /**
   * Constructor.
   *
   * @param url Server URL that will be used for the request
   * @param options Configuration options
   * @param behavior Behavior for request (basic, or stream)
   */
  constructor(
    private url: string,
    private options: RequestInit = {},
    private behavior: FetchBehavior = FetchBehavior.simple,
    private silent: boolean = false,
  ) {
    if (options.body) {
      if ((Object.prototype.toString.call(options.body) !== '[object String]')) {
        options.body = JSON.stringify(options.body)
      }

    }

  }

  /**
   * cancel() Cancels the current request
   */
  public cancel(): void {
    this.disconnect();
    if (this.observer) {
      this.observer.complete();
      this.observer = null;
      this.observable = Observable.create((observer: Observer<T>) => {
        this.observer = observer;
      });

    }

  }

  /**
   * disconnect() Closes an active HTTP stream
   */
  private disconnect(): void {
    if (jsEnv.isBrowser) {
      this.abortController.abort();
      this.abortController = new AbortController();
    } else {
      if (this.observer) {
        this.observer.error('closed');
      }
      
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
    options?: RequestInit,
    behavior?: FetchBehavior
  ) {
    if (behavior) {
      this.behavior = behavior;
    }

    this.url = url;

    if (options) {
      this.options = options;
    }

  }

  /**
   * fetch() Put the request in motion. Subscribe to return value.
   */
  public fetch(): Observable<T> {
    const cleanUp: Subject<boolean> = new Subject();
    const httpFetch = this._fetch();

    let behavior: Promise<any> =
      this.behavior === FetchBehavior.stream
        ? this.streamHandler(httpFetch)
        : (this.behavior === FetchBehavior.simple
          ? this.simpleHandler(httpFetch)
          : this.simpleHandlerWithHeaders(httpFetch));

    behavior.catch(exception => {
      if (!this.silent) {
        console.log("[rxhttp] exception", exception);
      }

      if (this.observer) {
        if (exception instanceof TypeError) {
          if (!this.receivedBytes) {
            this.observer.error(FetchError.connectionRefused);
            if (this.abortController) {
              this.cancel();
            }

          } else {
            this.observer.complete();
            if (this.abortController) {
              this.cancel();
            }

          }

        } else {
          const errorCode = exception[0];
          const errorMessagePromise = exception[1];

          if (errorMessagePromise) {
            errorMessagePromise.then((errorMessage: object) => {
              if (this.observer) {
                if (errorCode !== undefined) {
                  this.observer.error({ errorCode, errorMessage });
                } else {
                  this.observer.complete();
                }
                
              }

            });

          } else {
            const errorMessage = {};
            if (errorCode !== undefined) {
              this.observer.error({ errorCode, errorMessage });
            } else {
              this.observer.complete();
            }
            
          }

          if (this.abortController) {
            this.cancel();
          }

        }

      }

    });

    return this.observable
      .pipe(takeUntil(cleanUp), finalize(() => {
        this.cancel();
      }));
  }

  public _fetch(): Promise<void | Response> {
    if (jsEnv.isBrowser) {
      let config = merge(
        merge(
          this.defaultRequestOptions, {
            signal: this.abortController.signal
          }

        ), this.options

      );

      return fetch(
        this.url,
        config
      );

    } else {
      let config = merge(
        merge(
          this.defaultRequestOptions, {
            signal: undefined
          }

        ), this.options

      );

      return nodeFetch(
        this.url,
        config
      );

    }

  }

  /**
   * simpleHandler() Handles a simple HTTP response containing JSON data
   *
   * @param httpFetch Promise to handle
   */
  private simpleHandler(httpFetch: Promise<any>): Promise<any> {
    let error = false;

    return httpFetch.then((response: Response) => {
      error = response.status < 200 || response.status > 299;
      if (error) {
        throw [response.status, response.json()];
      } else {
        return response.json();
      }

    }).then(json => {
      if (this.observer) {
        this.observer.next(json);
        this.observer.complete();
      }

    });

  }

  /**
   * simpleHandlerWithHeaders() Handles a simple HTTP response containing JSON data and
   * includes headers with the response
   *
   * @param httpFetch Promise to handle
   */
  private simpleHandlerWithHeaders(httpFetch: Promise<any>): Promise<any> {
    return httpFetch.then(response => {
      response.json().then((json: T) => {
        (<Observer<any>>this.observer).next({
          response: json,
          headers: response.headers
        });

      });

    });

  }

  /**
   * streamHandler() Handles a long-lived HTTP stream
   *
   * @param httpFetch Promise to handle
   */
  private streamHandler(httpFetch: Promise<any>): Promise<any> {
    return httpFetch.then(
      (httpConnection) => {
        if (!this.receivedBytes) {
          this.receivedBytes = true;
        }

        if (jsEnv.isBrowser) {
          return this.readableStream(
            httpConnection.body.getReader(),
            <Observer<T>>this.observer,
            this.abortController
          );

        } else {
          const jsonBufferFull = new Subject();
          fromEvent(httpConnection.body, 'data').pipe(
            map((bytes: any) => String.fromCharCode.apply(null, bytes)),
            tap((string) => {
              this.jsonStrBuffer += string;
              if (this.jsonStrBuffer.length > 1) {
                try {
                  JSON.parse(this.jsonStrBuffer);
                  jsonBufferFull.next(true);
                } catch {
                  if (!this.silent) {
                    console.log("[rxhttp] error - ", this.jsonStrBuffer);
                  }

                }

              }
              
            }),
            buffer(jsonBufferFull)
          ).subscribe((_full: any) => {
            if (this.observer) {
              (<Observer<T>>this.observer).next(JSON.parse(this.jsonStrBuffer));
              this.jsonStrBuffer = '';
            }

          });

          fromEvent(httpConnection.body, 'end').pipe(take(1)).subscribe((_ended) => {
            httpConnection.body.destroy();
            if (this.observer) {
              (<Observer<T>>this.observer).complete();
            }

          });

          return httpConnection.body;
        }

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
    observer: Observer<T>,
    abortController: AbortController,
    silent: boolean = this.silent
  ): ReadableStream {
    return new ReadableStream({
      start: (controller: any) => {
        return next();
        function next(): any {
          const decoder = new TextDecoder('utf-8');
          return reader.read().then(
            ({ done,
              value }: any) => {
              if (done) {
                abortController.abort();
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
                  if (!silent) {
                    console.log('[rxhttp] decoded response (ignored) not json (browser) ', value);
                  }

                }

              } catch {
                if (!silent) {
                  console.log('[rxhttp] response (ignored) not utf-8 encoded, (browser)', value);
                }

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
