/**
 * Breaker component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const utils = require('../../src/utils');
const expect = require('chai').expect;

/* Tests ---------------------------------------------------------------------*/

describe('utils', () => {

  describe('#basicParser', () => {
    it('should return properly formatted results', () => {
      expect(utils.basicParser({ '123': { id: 123 } }, ['123'])).to.deep.equal({ '123': { id: 123 }});
      expect(utils.basicParser({ '123': { id: 123 } }, [123])).to.deep.equal({ '123': { id: 123 }}); 
      expect(utils.basicParser([{ id: 123 }], [123])).to.deep.equal({ '123': { id: 123 }});
      expect(utils.basicParser([{ id: '123' }], [123])).to.deep.equal({ '123': { id: '123' }});
    });

    it('should trim out unwanted results', () => {
      expect(utils.basicParser({ '123': { id: 123 }, '456': { id: 456 } }, [123])).to.deep.equal({ '123': { id: 123 }});
      expect(utils.basicParser([{ id: '123' }, { id: '456'}], [123])).to.deep.equal({ '123': { id: '123' }});
    })
  });
});
