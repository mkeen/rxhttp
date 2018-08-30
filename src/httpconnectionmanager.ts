import { Observable } from 'rxjs';

class HttpConnectionManager<T> {
  constructor(public observable: Observable<T>) { }

  public cancel() {
    this.observable.unsubscribe();
  }
}
