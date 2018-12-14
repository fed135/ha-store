import {GroupId, IRequestMetadata} from './types';

/**
 * List and hold all requests for future use
 * Requests are grouped by id for easy retrieval by the Tick & Batcher
 */
export default class Queue<T extends IRequestMetadata = IRequestMetadata> {
  private list: { [groupId: string]: T[] } = {};
  private history: GroupId[] = [];

  constructor() {
  }

  public add(value: T): void {
    if (!this.list[value.groupId]) {
      this.history.push(value.groupId);
      this.list[value.groupId] = [];
    }
    this.list[value.groupId].push(value);
  }

  public get(groupId: string): T[] {
    return this.list[groupId] || [];
  }

  public pop(): T[] {
    if (!this.history.length) {
      return [];
    }

    const groupId = this.history.shift() as string;
    const list = this.list[groupId];
    delete this.list[groupId];

    return list;
  }
}
