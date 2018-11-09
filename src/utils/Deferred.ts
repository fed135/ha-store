export default class Deferred<T> {
  public promise: Promise<T>;
  public resolve?: (result: T) => void;
  public reject?: (error: Error) => void;

  constructor() {
    this.promise = new Promise(
      (resolve: (result: T) => void, reject: (error: Error) => void) => {
        this.resolve = resolve;
        this.reject = reject;
      },
    );
  }
}
