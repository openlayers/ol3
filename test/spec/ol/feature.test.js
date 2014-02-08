goog.provide('ol.test.Feature');

describe('ol.Feature', function() {

  describe('constructor', function() {

    it('creates a new feature', function() {
      var feature = new ol.Feature();
      expect(feature).to.be.a(ol.Feature);
    });

    it('takes attribute values', function() {
      var feature = new ol.Feature({
        foo: 'bar'
      });
      expect(feature.get('foo')).to.be('bar');
    });

    it('can store the feature\'s commonly used id', function() {
      var feature = new ol.Feature();
      feature.setId('foo');
      expect(feature.getId()).to.be('foo');
    });

    it('will set the default geometry', function() {
      var feature = new ol.Feature({
        geometry: new ol.geom.Point([10, 20]),
        foo: 'bar'
      });
      var geometry = feature.getGeometry();
      expect(geometry).to.be.a(ol.geom.Point);
      expect(feature.get('geometry')).to.be(geometry);
    });

  });

  describe('#get()', function() {

    it('returns values set at construction', function() {
      var feature = new ol.Feature({
        a: 'first',
        b: 'second'
      });
      expect(feature.get('a')).to.be('first');
      expect(feature.get('b')).to.be('second');
    });

    it('returns undefined for unset attributes', function() {
      var feature = new ol.Feature();
      expect(feature.get('a')).to.be(undefined);
    });

    it('returns values set by set', function() {
      var feature = new ol.Feature();
      feature.set('a', 'b');
      expect(feature.get('a')).to.be('b');
    });

  });

  describe('#getAttributes()', function() {

    it('returns an object with all attributes', function() {
      var point = new ol.geom.Point([15, 30]);
      var feature = new ol.Feature({
        foo: 'bar',
        ten: 10,
        geometry: point
      });

      var attributes = feature.getProperties();

      var keys = goog.object.getKeys(attributes);
      expect(keys.sort()).to.eql(['foo', 'geometry', 'ten']);

      expect(attributes.foo).to.be('bar');
      expect(attributes.geometry).to.be(point);
      expect(attributes.ten).to.be(10);
    });

  });


  describe('#getGeometry()', function() {

    var point = new ol.geom.Point([15, 30]);

    it('returns null for no geometry', function() {
      var feature = new ol.Feature();
      expect(feature.getGeometry()).to.be(null);
    });

    it('gets the geometry set at construction', function() {
      var feature = new ol.Feature({
        geometry: point
      });
      expect(feature.getGeometry()).to.be(point);
    });

    it('gets any geometry set by setGeometry', function() {
      var feature = new ol.Feature();
      feature.setGeometry(point);
      expect(feature.getGeometry()).to.be(point);

      var point2 = new ol.geom.Point([1, 2]);
      feature.setGeometry(point2);
      expect(feature.getGeometry()).to.be(point2);
    });

  });

  describe('#set()', function() {

    it('sets values', function() {
      var feature = new ol.Feature({
        a: 'first',
        b: 'second'
      });
      feature.set('a', 'new');
      expect(feature.get('a')).to.be('new');
    });

    it('can be used to set the geometry', function() {
      var point = new ol.geom.Point([3, 4]);
      var feature = new ol.Feature({
        geometry: new ol.geom.Point([1, 2])
      });
      feature.set('geometry', point);
      expect(feature.get('geometry')).to.be(point);
      expect(feature.getGeometry()).to.be(point);
    });

    it('can be used to set attributes with arbitrary names', function() {

      var feature = new ol.Feature();

      feature.set('toString', 'string');
      expect(feature.get('toString')).to.be('string');
      expect(typeof feature.toString).to.be('function');

      feature.set('getGeometry', 'x');
      expect(feature.get('getGeometry')).to.be('x');

      feature.set('geometry', new ol.geom.Point([1, 2]));
      expect(feature.getGeometry()).to.be.a(ol.geom.Point);

    });

  });

  describe('#setGeometry()', function() {

    var point = new ol.geom.Point([15, 30]);

    it('sets the default geometry', function() {
      var feature = new ol.Feature();
      feature.setGeometry(point);
      expect(feature.get('geometry')).to.be(point);
    });

    it('replaces previous default geometry', function() {
      var feature = new ol.Feature({
        geometry: point
      });
      expect(feature.getGeometry()).to.be(point);

      var point2 = new ol.geom.Point([1, 2]);
      feature.setGeometry(point2);
      expect(feature.getGeometry()).to.be(point2);
    });

  });

  describe('#setGeometryName()', function() {

    var point = new ol.geom.Point([15, 30]);

    it('sets property where to to look at geometry', function() {
      var feature = new ol.Feature();
      feature.setGeometry(point);
      expect(feature.getGeometry()).to.be(point);

      var point2 = new ol.geom.Point([1, 2]);
      feature.set('altGeometry', point2);
      expect(feature.getGeometry()).to.be(point);
      feature.setGeometryName('altGeometry');
      expect(feature.getGeometry()).to.be(point2);

      feature.on('change', function() {
        expect.fail();
      });
      point.setCoordinates([0, 2]);
    });

    it('changes property listener', function(done) {
      var feature = new ol.Feature();
      feature.setGeometry(point);
      var point2 = new ol.geom.Point([1, 2]);
      feature.set('altGeometry', point2);
      feature.setGeometryName('altGeometry');

      feature.on('change', function() {
        done();
      });
      point2.setCoordinates([0, 2]);
    });

  });

  describe('#getStyleFunction()', function() {

    var styleFunction = function(feature, resolution) {
      return null;
    };

    it('returns undefined after construction', function() {
      var feature = new ol.Feature();
      expect(feature.getStyleFunction()).to.be(undefined);
    });

    it('returns the function passed to setStyleFunction', function() {
      var feature = new ol.Feature();
      feature.setStyleFunction(styleFunction);
      expect(feature.getStyleFunction()).to.be(styleFunction);
    });

    it('does not get confused with user "styleFunction" property', function() {
      var feature = new ol.Feature();
      feature.set('styleFunction', 'foo');
      expect(feature.getStyleFunction()).to.be(undefined);
    });

    // TODO: also assert that 'styleFunction' passed to the constructor is
    // not confused with the internal 'styleFunction_'.
    // See https://github.com/openlayers/ol3/issues/1672

  });

  describe('#setStyleFunction()', function() {

    var styleFunction = function(feature, resolution) {
      return null;
    };

    it('sets the style function', function() {
      var feature = new ol.Feature();
      feature.setStyleFunction(styleFunction);
      expect(feature.getStyleFunction()).to.be(styleFunction);
    });

    it('dispatches a change event', function(done) {
      var feature = new ol.Feature();
      feature.on('change', function() {
        done();
      });
      feature.setStyleFunction(styleFunction);
    });

  });



});


goog.require('goog.events');
goog.require('goog.object');
goog.require('ol.Feature');
goog.require('ol.geom.Point');
