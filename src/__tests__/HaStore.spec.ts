import {IParams, IResult, Response, Serializable} from '../types';
import {expect} from 'chai';
import * as sinon from 'sinon';
import HaStore from '../HaStore';

describe('HaStore class', () => {
  describe('resolver', () => {
    class Dog {
      get description(): string {
        return `${this.name} is a ${this.isGood ? 'good' : 'bad'} ${this.praiseSuffix}`;
      }

      constructor(public name: string, private praiseSuffix: ('girl' | 'boy' | 'dog'), public isGood: boolean = true) {
      }
    }

    const store: Dog[] = [
      new Dog('Georgina', 'girl'),
      new Dog('Bella', 'girl', false),
      new Dog('Whiskey', 'boy'),
    ];

    const getDogById = async (ids: Serializable[]): Promise<IResult<Dog>> => {
      const response: Response<Dog> = {};
      ids.forEach((id: Serializable) => {
        response[`${id}`] = store[Number(id)];
      });
      return {response, error: null};
    };

    it('should properly retain the defined return type', async () => {
      const store = new HaStore<Dog>(getDogById);
      const bestDogId = 0;
      const goodDogs: Response<Dog> = (await store.get([bestDogId, 2])).response;

      const dogList = Object.values(goodDogs);
      expect(dogList).to.have.lengthOf(2);
      expect(dogList.every((dog: Dog) => dog.isGood)).to.be.true;

      const bestDog: Dog = goodDogs[bestDogId];
      expect(bestDog.name).to.equal('Georgina');
      expect(bestDog.description).to.be.equal('Georgina is a good girl');

    });
  });

  describe('middlewares', () => {
    const resolverSpy = sinon.spy();
    const echoResolver = async (ids: Serializable[], params?: IParams) => {
      resolverSpy(ids, params);
      const response: Response<number> = {};
      ids.forEach((id: Serializable) => {
        response[`${id}`] = Number(id);
      });
      return {response, error: null};
    };

    it('should resolve all ids passed to the resolver', async () => {
      const store = new HaStore(echoResolver);

      return Promise.all([
        store.get([0], {region: 'us'}),
        store.get([0, 1, 3], {region: 'us'}),
      ])
        .then(([resultA, resultB]) => {
          expect(resultA.response).to.deep.equal({"0": 0});
          expect(resultB.response).to.deep.equal({"0": 0, "1": 1, "3": 3});
          sinon.assert.calledOnce(resolverSpy);
        });
    });

  });
});
