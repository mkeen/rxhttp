import { Subject, Observable, Observer, Subscription } from 'rxjs';
import { take, takeUntil, filter } from 'rxjs/operators';

import {
  HttpRequestHeaders,
  HttpRequestOptions,
  HttpRequestState,
  BasicResponse
} from './types';

declare var ReadableStream: {
  prototype: ReadableStream;
  new(underlyingSink?: any, queueingStrategy?: any): any;
};

export class HttpRequest<T> {
  private url: string;
  private options: HttpRequestOptions;
  private $cancel: Subject<boolean> = new Subject<boolean>();

  constructor(url: string, options: HttpRequestOptions = {}) {
    this.url = url;
    this.options = options;
  }

  public configure(url: string, options: HttpRequestOptions = {}) {
    this.url = url;
    this.options = options;
  }

  public cancel(): Observable<boolean> {
    this.$cancel.next(true);
    return Observable
      .create((observer: Observer<boolean>) => {
        this.$cancel
          .pipe(take(1))
          .subscribe((value) => {
            observer.complete();
          });

      });

  }

  public send(): Observable<T> {
    return Observable
      .create((observer: Observer<T>) => {
        fetch(this.url, Object.assign({
          headers: {
            'Content-Type': 'application/json'
          }

        }, this.options))
          .then(response => response.json())
          .then(response => observer.next(response))
      });

  }

  public listen(): Observable<T> {
    return Observable
      .create((observer: Observer<T>) => {
        fetch(this.url, Object.assign({
          headers: {
            'Content-Type': 'application/json'
          }

        }, this.options))
          .then((response: BasicResponse) => {
            const reader = response.body.getReader();
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
                    let parsedDecodedValue: T;

                    try {
                      decodedValue = new TextDecoder('utf-8').decode(value);
                      try {
                        parsedDecodedValue = JSON.parse(decodedValue);
                        observer.next(parsedDecodedValue);
                      } catch {
                        console.error('can\'t parse json', decodedValue);
                      }

                    } catch {
                      console.error('Response was not utf-8 bytes');
                    }

                    return next();
                  })

                }

              },

              cancel: () => {
                console.log('stream cancelled');
              }

            })

          }).then(stream => {
            return new Response(stream)
          }).catch(() => {
            console.log('error');
          });

      })
      .pipe(takeUntil(this.$cancel))
      .pipe(filter(fragment => !!fragment))
  }

}
