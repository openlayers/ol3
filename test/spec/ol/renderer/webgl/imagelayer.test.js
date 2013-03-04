goog.provide('ol.test.renderer.webgl.ImageLayer');

describe('ol.renderer.webgl.ImageLayer', function() {
  describe('updateProjectionMatrix_', function() {
    var map;
    var renderer;
    var canvasWidth;
    var canvasHeight;
    var viewExtent;
    var viewResolution;
    var viewRotation;
    var imageExtent;

    beforeEach(function() {
      map = new ol.Map({
        target: 'map'
      });
      var layer = new ol.layer.ImageLayer({
        source: new ol.source.ImageSource({
          extent: new ol.Extent(0, 0, 1, 1)
        })
      });
      renderer = new ol.renderer.webgl.ImageLayer(map.getRenderer(), layer);

      // input params
      canvasWidth = 512;
      canvasHeight = 256;
      viewResolution = 10;
      viewRotation = 0;
      viewCenter = new ol.Coordinate(7680, 3840);
      // view extent is 512O, 2560, 10240, 5120

      // image size is 1024, 768
      // image resolution is 10
      imageExtent = new ol.Extent(0, 0, 10240, 7680);
    });

    afterEach(function() {
      map.dispose();
    });

    it('produces a correct matrix', function() {

      renderer.updateProjectionMatrix_(canvasWidth, canvasHeight,
          viewCenter, viewResolution, viewRotation, imageExtent);
      var matrix = renderer.getProjectionMatrix();

      var input;
      var output = goog.vec.Vec4.createNumber();

      input = goog.vec.Vec4.createFromValues(-1, -1, 0, 1);
      goog.vec.Mat4.multVec4(matrix, input, output);
      expect(output[0]).toEqual(-3);
      expect(output[1]).toEqual(-3);

      input = goog.vec.Vec4.createFromValues(1, -1, 0, 1);
      goog.vec.Mat4.multVec4(matrix, input, output);
      expect(output[0]).toEqual(1);
      expect(output[1]).toEqual(-3);

      input = goog.vec.Vec4.createFromValues(-1, 1, 0, 1);
      goog.vec.Mat4.multVec4(matrix, input, output);
      expect(output[0]).toEqual(-3);
      expect(output[1]).toEqual(3);

      input = goog.vec.Vec4.createFromValues(1, 1, 0, 1);
      goog.vec.Mat4.multVec4(matrix, input, output);
      expect(output[0]).toEqual(1);
      expect(output[1]).toEqual(3);

      input = goog.vec.Vec4.createFromValues(0, 0, 0, 1);
      goog.vec.Mat4.multVec4(matrix, input, output);
      expect(output[0]).toEqual(-1);
      expect(output[1]).toEqual(0);
    });
  });
});

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec4');
goog.require('ol.Extent');
goog.require('ol.Image');
goog.require('ol.Map');
goog.require('ol.layer.ImageLayer');
goog.require('ol.source.ImageSource');
goog.require('ol.renderer.Map');
goog.require('ol.renderer.webgl.ImageLayer');
