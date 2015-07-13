var expect = require('chai').expect;

var utils = require('../../libs/utils');

describe('Utils', function() {
  describe('changeCase', function() {
    it('should convert camelCase to snake_case', function() {
      var input = {firstName: 'Liam'};

      //jscs:disable disallowQuotedKeysInObjects
      var output = {'first_name': 'Liam'};

      expect(utils.changeCase('snakeCase', input)).to.deep.equal(output);
    });
  });
});
