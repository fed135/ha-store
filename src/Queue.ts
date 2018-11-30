// import {IRequestMetadata, IResult} from './types';
//
// function joinResponse(responses:): IResult {
//
// }

import {GroupId, IRequestMetadata} from "./types";

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

  public pop(): T[] {
    if (!this.history.length) {
      return [];
    }

    const groupId = this.history.shift() as string;
    const list = this.list[groupId];
    delete this.list[groupId];

    return list;
  }

  // public add(value: IRequestMetadata): Promise<IResult> {
  // // TODO: DPL: Prevent duplications
  // this.list.push(value);
  //
  // const resolvers = value.ids.map((id: string) => {
  //   return this.find(id, value.params) ||
  //
  // });
  //
  // return Promise.all(resolvers).then(joinResponses);
  // }

  // private find(metaData:IRequestMetadata): Entity {
  // return this.list.find(()=>{})
  // }

  // public next(): IRequestMetadata | null {
  // if (this.list.length > 0) {
  //   return this.list.pop() || null;
  // }
  //
  // return null;
  // }

  // public remove(index: number): boolean {
  // if (this.list.length > index) {
  //   this.list = this.list.slice(index, index + 1);
  //   return true;
  // }
  //
  // return false;
  // }
}
