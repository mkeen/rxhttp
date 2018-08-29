import { Subject, Observable, Observer, Subscription, BehaviorSubject } from 'rxjs';
import { take, takeUntil, filter } from 'rxjs/operators';
import { TextEncoder, TextDecoder } from 'text-encoding-shim';
import { ReadableStreamDefaultReader } from 'whatwg-streams';
import { ReadableStream } from '@mattiasbuelens/web-streams-polyfill/ponyfill';

import {
  HttpRequestHeaders,
  HttpRequestOptions,
  HttpRequestState,
  BasicResponse
} from './types';

export class HttpRequest<T> {
  private abortController: AbortController = new AbortController();
  private defaultRequestOptions: HttpRequestOptions = {
    headers: {
      'Content-Type': 'application/json'
    }

  }

  constructor(
    private url: string,
    private options: HttpRequestOptions
  ) { }

  public reconfigure(url: string, options: HttpRequestOptions = {}) {
    this.abortController.abort();
    this.url = url;
    this.options = options;
  }

  public send(): Observable<T> {
    return Observable
      .create((observer: Observer<T>) => {
        fetch(this.url, Object.assign(this.defaultRequestOptions, this.options))
          .then(response => response.json())
          .then(response => observer.next(response))
      });

  }

  public listen(): Observable<T> {
    const cancel$: Subject<boolean> = new BehaviorSubject(false);
    return Observable
      .create((observer: Observer<T>) => {
        this.abortController = new AbortController();
        fetch(this.url,
          Object.assign(
            Object.assign(
              this.defaultRequestOptions, {
                signal: this.abortController.signal
              }

            ), this.options
          )).then((response: BasicResponse) => {
            return this.readableStream(
              response.body.getReader(),
              observer
            );

          }).then(stream => {
            return stream;
          }).catch((e) => {
            if (e instanceof DOMException) {
              cancel$.next(true);
            } else {
              console.error('unknown error');
              cancel$.next(true);
            }

          });

      })
      .pipe(takeUntil(cancel$))
      .pipe(filter(fragment => !!fragment))
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
