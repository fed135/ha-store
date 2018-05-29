/**
 * Queue component unit tests
 */

/* Requires ------------------------------------------------------------------*/

const utils = require('../../src/utils');
const expect = require('chai').expect;

/* Tests ---------------------------------------------------------------------*/

describe('utils', () => {

  describe('#requiredParam', () => {
    it('should throw upon calling', () => {
      expect(utils.requiredParam.bind(null, 'foo', '{boolean} The definition')).to.throw('Parameter "foo" is missing.\nExpected\n\tfoo: {boolean} The definition')
    });
  });
});
