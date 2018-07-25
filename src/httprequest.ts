import { Observable, Observer, Subject } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';

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

  public cancel(): Observable<boolean> {
    return Observable
      .create((observer: Observer<boolean>) => {
        this.$cancel
          .pipe(take(1))
          .subscribe((value) => {
            this.$cancel.next(false);
            observer.complete();
          });

        this.$cancel.next(true);
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
          .then(stream => stream)
          .catch(() => {
            console.log("Database conection error: Unknown");
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
