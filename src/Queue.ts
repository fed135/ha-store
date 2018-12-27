import {GroupId, IRequestMetadata} from './types';

/**
 * List and hold all requests for future use
 * Requests are grouped by id for easy retrieval by the tick function
 */
export default class Queue<T> {
  private list: { [groupId: string]: IRequestMetadata<T>[] } = {};
  private history: GroupId[] = [];

  constructor() {
  }

  public add(value: IRequestMetadata<T>): void {
    if (!this.list[value.groupId]) {
      this.history.push(value.groupId);
      this.list[value.groupId] = [];
    }
    this.list[value.groupId].push(value);
  }

  public get(groupId: string): IRequestMetadata<T>[] {
    return this.list[groupId] || [];
  }

  public pop(): IRequestMetadata<T>[] {
    if (!this.history.length) {
      return [];
    }

    const groupId = this.history.shift() as string;
    const group = this.list[groupId];
    delete this.list[groupId];

    return group;
  }
}
