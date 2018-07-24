import { Observable, Observer, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

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
  private textDecoder: TextDecoder = new TextDecoder('utf-8');


  constructor(url: string, options: HttpRequestOptions = {}) {
    this.url = url;
    this.options = options;
  }

  public cancel(): void {
    console.log("about to cancel");
    this.$cancel.next(true);
  }

  public get(url: string): Observable<T> {
    return Observable.create((observer: Observer<T>) => {
      fetch(url, Object.assign({
        headers: {
          'Content-Type': 'application/json'
        }
      }, this.options)).then((response: any) => {
        return observer.next(this.parseResponseData(response));
      });
    });
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

  public listen(): Observable<T> {
    return Observable.create((observer: Observer<T>) => {
      fetch(this.url, Object.assign({
        headers: {
          'Content-Type': 'application/json'
        }
      }, this.options)).then((response: any) => {
        const reader = response.body.getReader();
        return new ReadableStream({
          start: (controller: any) => {
            let next = () => {
              return reader.read().then(({ done, value }: any) => {
                if (done) {
                  controller.close();
                  observer.complete();
                  return;
                }

                controller.enqueue(value);
                observer.next(
                  this.parseResponseData(value, true)
                );
                return next();
              })
            }

            return next();
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
    }).pipe(takeUntil(this.$cancel))
      .pipe(filter((fragment: any) => !!fragment));
  }
}

