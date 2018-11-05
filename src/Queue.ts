export default class Queue<T> {
  constructor(private list: T[] = []) {
        // Prevent side effects by making a copy
    this.list = [...list];
  }

  public add(value: T) {
        // TODO: DPL: Prevent duplications
    this.list.push(value);
  }

  public next(): T | null {
    if (this.list.length > 0) {
      return this.list.pop() || null;
    }

    return null;
  }

  public remove(index: number): boolean {
    if (this.list.length > index) {
      this.list = this.list.slice(index, index + 1);
      return true;
    }

    return false;
  }
}
