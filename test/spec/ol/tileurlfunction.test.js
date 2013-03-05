goog.provide('ol.test.TileUrlFunction');

describe('ol.TileUrlFunction', function() {

  describe('createFromTemplate', function() {
    it('creates expected URL', function() {
      var tileUrl = ol.TileUrlFunction.createFromTemplate('{z}/{x}/{y}');
      expect(tileUrl(new ol.TileCoord(3, 2, 1))).toEqual('3/2/1');
      expect(tileUrl(null)).toBeUndefined();
    });
    describe('with number range', function() {
      it('creates expected URL', function() {
        var template = 'http://tile-{1-3}/{z}/{x}/{y}';
        var tileUrlFunction = ol.TileUrlFunction.createFromTemplate(template);
        var tileCoord = new ol.TileCoord(3, 2, 1);
        tileCoord.hash = function() { return 3; };
        expect(tileUrlFunction(tileCoord)).toEqual('http://tile-1/3/2/1');
        tileCoord.hash = function() { return 2; };
        expect(tileUrlFunction(tileCoord)).toEqual('http://tile-3/3/2/1');
        tileCoord.hash = function() { return 1; };
        expect(tileUrlFunction(tileCoord)).toEqual('http://tile-2/3/2/1');
      });
    });
    describe('with character range', function() {
      it('creates expected URL', function() {
        var template = 'http://tile-{c-e}/{z}/{x}/{y}';
        var tileUrlFunction = ol.TileUrlFunction.createFromTemplate(template);
        var tileCoord = new ol.TileCoord(3, 2, 1);
        tileCoord.hash = function() { return 3; };
        expect(tileUrlFunction(tileCoord)).toEqual('http://tile-c/3/2/1');
        tileCoord.hash = function() { return 2; };
        expect(tileUrlFunction(tileCoord)).toEqual('http://tile-e/3/2/1');
        tileCoord.hash = function() { return 1; };
        expect(tileUrlFunction(tileCoord)).toEqual('http://tile-d/3/2/1');
      });
    });
  });

  describe('withTileCoordTransform', function() {
    it('creates expected URL', function() {
      var tileUrl = ol.TileUrlFunction.withTileCoordTransform(
          function(tileCoord) {
            return new ol.TileCoord(tileCoord.z, tileCoord.x, -tileCoord.y);
          },
          ol.TileUrlFunction.createFromTemplate('{z}/{x}/{y}'));
      expect(tileUrl(new ol.TileCoord(3, 2, -1))).toEqual('3/2/1');
      expect(tileUrl(null)).toBeUndefined();
    });
  });

  describe('createFromTileUrlFunctions', function() {
    it('creates expected URL', function() {
      var tileUrl = ol.TileUrlFunction.createFromTileUrlFunctions([
        ol.TileUrlFunction.createFromTemplate('a'),
        ol.TileUrlFunction.createFromTemplate('b')
      ]);
      var tileUrl1 = tileUrl(new ol.TileCoord(1, 0, 0));
      var tileUrl2 = tileUrl(new ol.TileCoord(1, 0, 1));
      expect(tileUrl1).not.toEqual(tileUrl2);
      expect(tileUrl(null)).toBeUndefined();
    });
  });

  describe('createWMSParams', function() {
    var tileGrid;
    beforeEach(function() {
      tileGrid = new ol.tilegrid.XYZ({
        maxZoom: 10
      });
    });
    it('creates expected URL', function() {
      var epsg3857 = ol.projection.getFromCode('EPSG:3857');
      var tileUrlFunction = ol.TileUrlFunction.createWMSParams(
          'http://wms?foo=bar', {});
      var tileCoord = new ol.TileCoord(1, 0, 0);
      var tileUrl = tileUrlFunction(tileCoord, tileGrid, epsg3857);
      var expected = 'http://wms?foo=bar&SERVICE=WMS&VERSION=1.3.0&' +
          'REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&WIDTH=256&' +
          'HEIGHT=256&BBOX=-20037508.342789244%2C20037508.342789244%2C0%2C' +
          '40075016.68557849&CRS=EPSG%3A3857&STYLES=';
      expect(tileUrl).toEqual(expected);
    });
    it('creates expected URL respecting axis orientation', function() {
      var epsg4326 = ol.projection.getFromCode('EPSG:4326');
      var tileUrlFunction = ol.TileUrlFunction.createWMSParams(
          'http://wms?foo=bar', {});
      var tileCoord = new ol.TileCoord(1, 0, 0);
      var tileUrl = tileUrlFunction(tileCoord, tileGrid, epsg4326);
      var expected = 'http://wms?foo=bar&SERVICE=WMS&VERSION=1.3.0&' +
          'REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&WIDTH=256&' +
          'HEIGHT=256&BBOX=20037508.342789244%2C-20037508.342789244%2C' +
          '40075016.68557849%2C0&CRS=EPSG%3A4326&STYLES=';
      expect(tileUrl).toEqual(expected);
    });
  });
});

goog.require('ol.TileCoord');
goog.require('ol.TileUrlFunction');
goog.require('ol.projection');
goog.require('ol.tilegrid.XYZ');
