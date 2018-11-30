import { Data, Middleware, IResult } from '../types';
import { expect } from 'chai';
import HaStore from '../HaStore';

const testMiddleware = (modifier: (response: Data) => Data): Middleware => {
  return (error: Error | null, response: Data, next?: Middleware): IResult => {
    const newResponse: Data = modifier(response);
    return next
      ? next(error, newResponse)
      : { error, response: newResponse };
  };
};

describe('HaStore class', () => {
  describe('middlewares', () => {
    test('should go through each middleware in order', async () => {
      const store = new HaStore([
        testMiddleware(data => `${data || ''}0`),
        testMiddleware(data => `${data || ''}1`),
        testMiddleware(data => `${data || ''}2`),
        testMiddleware(data => `${data || ''}3`),
      ]);

      const { response }: IResult = await store.get(
        [0],
        { region: 'us' },
        (error: Error | null, response: Data) => {
          return { error: null, response: null };
        });

      expect(response).to.equal('0123');
    });
  });

});
