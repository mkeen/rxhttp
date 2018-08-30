import { Observable } from "rxjs";

interface RxHttpObservableOptionals {
  cancel?: () => void;
}

export class RxHttpObservable<T> extends Observable<T> implements RxHttpObservableOptionals {
  public cancel: () => void = () => { };
}
