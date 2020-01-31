import { merge } from 'lodash';
import { takeUntil } from 'rxjs/operators';
import { Observable, Observer, Subject } from 'rxjs';

import {
  FetchBehavior,
  FetchError,
  HttpRequestOptions,
} from './types';

const nodeFetch = require('node-fetch');

/**
 * Class for managing an HTTP request. Supports two different behaviors:
 *   - Simple (good ol' fashioned 1:1 request response)
 *   - Stream (Opens a connection and receives a stream of json objects)
 * @param T <T> Expected type of response data
 */
export class HttpRequest<T> {
  private receivedBytes: boolean = false;
  private abortController: any = typeof (process) !== 'object' ? new AbortController() : null;

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
      'Content-Type': 'application/json; charset=utf-8',
    },

    credentials: 'include'
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
      this.observable = Observable.create((observer: Observer<T>) => {
        this.observer = observer;
      });
      
    }

  }

  /**
   * disconnect() Closes an active HTTP stream
   */
  public disconnect(): void {
    if (typeof (process) !== 'object') {
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

    this.disconnect();
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
      if (this.observer) {
        if (exception instanceof TypeError) {
          if (!this.receivedBytes) {
            this.observer.error(FetchError.connectionRefused);
            if (this.abortController) {
              this.disconnect();
            }

          } else {
            this.observer.complete();
            if (this.abortController) {
              this.disconnect();
            }

          }

        } else {
          const errorCode = exception[0];
          const errorMessagePromise = exception[1];

          if (errorMessagePromise) {
            errorMessagePromise.then((errorMessage: object) => {
              if (this.observer) {
                this.observer.error({ errorCode, errorMessage });
              }

            });

          } else {
            const errorMessage = {};
            this.observer.error({ errorCode, errorMessage });
          }

          if (this.abortController) {
            this.disconnect();
          }

        }

      }

    });

    return this.observable
      .pipe(takeUntil(cleanUp));
  }

  public _fetch(): Promise<void | Response> {
    if (typeof (process) !== 'object') {
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
    let error = false;

    return httpFetch.then((response: Response) => {
      error = response.status < 200 || response.status > 299;
      if (error) {
        throw [response.status, response.json()];
      } else {
        return response.json();
      }

    }).then(json => {
      (<Observer<T>>this.observer).next(json);
      (<Observer<T>>this.observer).complete();
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

        if (typeof (process) !== 'object') {
          return this.readableStream(
            httpConnection.body.getReader(),
            <Observer<T>>this.observer,
            this.abortController
          );
          
        } else {
          httpConnection.body.on('data', (bytes: any) => {
            const buffer = Buffer.from(bytes);
            if (buffer.length > 1) {
              try {
                const val = buffer.toString('utf-8');
                try {
                  const parsedJson = JSON.parse(val);
                  (<Observer<T>>this.observer).next(parsedJson);
                } catch (e2) {
                  console.log('decoded response (ignored) not json (nodejs)', e2, bytes);
                }

              } catch (e3) {
                console.log('response (ignored) not utf-8 encoded (nodejs)');
              }

            }

          });

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
    abortController: AbortController
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
                  console.log('decoded response (ignored) not json (browser) ', value);
                }

              } catch {
                console.log('response (ignored) not utf-8 encoded, (browser)', value);
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
