import { Observable, Observer, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TextDecoder } from 'text-encoding-shim';
import { ReadableStreamDefaultReader } from 'whatwg-streams';
import { ReadableStream } from '@mattiasbuelens/web-streams-polyfill/ponyfill';

import {
  FetchBehavior,
  HttpRequestOptions
} from './types';

/**
 * Main class to implement Rxhttp
 *
 * @param T <T> Generic type parameter.
 */
export class HttpRequest<T> {
  /**
   * Default implemetation of AbortController from Web API.
   */
  private abortController: AbortController = new AbortController();
  /**
   * Default implemetation of Observer from rxjs.
   */
  private observer: Observer<T> | null = null;
  /**
   * Default implemetation of Observable from rxjs.
   */
  private observable: Observable<T> = Observable
    .create((observer: Observer<T>) => {
      this.observer = observer;
    });

  /**
   * Default implemetation of Content-Type option for request.
   */
  private defaultRequestOptions: HttpRequestOptions = {
    headers: {
      'Content-Type': 'application/json'
    }

  }

  /**
   * Constructor.
   *
   * @param url Server URL that will be used for the request.
   * @param options Options that will be sent in request.
   * @param behavior Behavior for request.
   */
  constructor(
    private url: string,
    private options: HttpRequestOptions,
    private behavior: FetchBehavior = FetchBehavior.simple
  ) { }

  /**
   * cancel() Call disconnect function and create a new Observable that will subscribe a empty observer to it.
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
   * disconnnect() Aborts a DOM request before it has completed.
   * This is able to abort fetch requests, consumption of any response Body, and streams.
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
   * @param url Server URL that will be used for the request.
   * @param options Options that will be sent in request.
   * @param behavior Behavior for request.
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

    this.send();
  }

  /**
   * send() Call fetch()
   *
   * @param fetchBehavior
   */
  public send(
    fetchBehavior: FetchBehavior = FetchBehavior.simple
  ): Observable<T> {
    return this.fetch();
  }

  /**
   * fetch()
   */
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

  /**
   * simpleHandler() Handle solved promise from simple
   *
   * @param httpFetch Promise to handle
   */
  private simpleHandler(httpFetch: Promise<any>): Promise<any> {
    return httpFetch
      .then(response => response.json())
      .then(response => (<Observer<T>>this.observer).next(response))
  }

  /**
   * streamHandler() Handle solved promise from stream
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
   * readableStream()
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
