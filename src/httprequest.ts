import { Subject, Observable, Observer, Subscription } from 'rxjs';
import { take, takeUntil, filter } from 'rxjs/operators';

interface HttpRequestState {
  messages: string[];
}

interface HttpRequestHeaders {
  "Content-Type": string;
}

interface HttpRequestOptions {
  headers?: HttpRequestHeaders;
  method?: string;
  body?: string;
  retry?: boolean;
}

interface NotNull {
  body: any;
}

declare var ReadableStream: {
  prototype: ReadableStream;
  new(underlyingSink?: any, queueingStrategy?: any): any;
};

export class HttpRequest<T> {
  private url: string;
  private options: HttpRequestOptions;
  private $cancel: Subject<boolean> = new Subject<boolean>();
  private textDecoder: any = new TextDecoder('utf-8');

  constructor(url: string, options: HttpRequestOptions = {}) {
    this.url = url;
    this.options = options;
  }

  public configure(url: string, options: HttpRequestOptions = {}) {
    console.log("reconfiguring");
    console.log(url, options);
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

  public get(): Observable<T> {
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
          .then((response: NotNull) => {
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
                      decodedValue = new TextDecoder("utf-8").decode(value);
                      try {
                        parsedDecodedValue = JSON.parse(decodedValue);
                        observer.next(parsedDecodedValue);
                      } catch { }
                    } catch { }
                    return next();
                  })
                }
              },
              cancel: () => {
                console.log("this is donezo");
              }
            })
          }).then(stream => {
            return new Response(stream)
          }).catch(() => {
            console.log("error");
          });

      })
      .pipe(takeUntil(this.$cancel))
      .pipe(filter(fragment => !!fragment))
  }

  private parseResponseData(data: any, parseBytes: boolean = false, parseJson: boolean = true): T {
    if (parseBytes) {
      try {
        data = this.decodeBytes(data);
      } catch {
        console.log("can't decode bytes");
      }

    }

    if (parseJson) {
      try {
        data = JSON.parse(data);
      } catch {
        console.log("json parse failed for", data);
      }
    }

    return data;
  }

  private decodeBytes(bytes: any): string {
    return this.textDecoder.decode(bytes);
  }

}
