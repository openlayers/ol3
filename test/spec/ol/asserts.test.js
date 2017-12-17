import {assert} from '../../../src/ol/asserts.js';

describe('ol/asserts', function() {

  describe('assert', function() {
    it('throws an exception', function() {
      expect(function() {
        assert(false, 42);
      }).to.throwException();
    });
  });

});
