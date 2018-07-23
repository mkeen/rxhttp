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


  constructor(url: string, options: HttpRequestOptions = {}) {
    this.url = url;
    this.options = options;
  }

  public cancel(): void {
    console.log("about to cancel");
    this.$cancel.next(true);
  }

  public retry(): Observable<T> {
    return this.send();
  }

  public send(): Observable<T> {
    return Observable.create((observer: Observer<T>) => {
      fetch(this.url, Object.assign({
        headers: {
          'Content-Type': 'application/json'
        }
      }, this.options)).then((response: NotNull) => {
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
                    console.log('rxhttp received', decodedValue);
                    try {
                      observer.next(parsedDecodedValue);
                    } catch {
                      console.log("could not pass on", parsedDecodedValue, observer);
                    }
                  } catch { console.log("non-json data ignored", decodedValue); }
                } catch { console.log("non-utf8 bytes ignored"); }

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
    }).pipe(takeUntil(this.$cancel))
      .pipe(filter((fragment: any) => !!fragment));
  }
}

