

import _ol_ from '../../../../../src/ol';
import _ol_Feature_ from '../../../../../src/ol/feature';
import _ol_Map_ from '../../../../../src/ol/map';
import _ol_TileState_ from '../../../../../src/ol/tilestate';
import _ol_VectorImageTile_ from '../../../../../src/ol/vectorimagetile';
import _ol_VectorTile_ from '../../../../../src/ol/vectortile';
import _ol_View_ from '../../../../../src/ol/view';
import _ol_extent_ from '../../../../../src/ol/extent';
import _ol_format_MVT_ from '../../../../../src/ol/format/mvt';
import _ol_geom_Point_ from '../../../../../src/ol/geom/point';
import _ol_layer_VectorTile_ from '../../../../../src/ol/layer/vectortile';
import _ol_proj_ from '../../../../../src/ol/proj';
import _ol_proj_Projection_ from '../../../../../src/ol/proj/projection';
import _ol_render_Feature_ from '../../../../../src/ol/render/feature';
import _ol_renderer_canvas_VectorTileLayer_ from '../../../../../src/ol/renderer/canvas/vectortilelayer';
import _ol_source_VectorTile_ from '../../../../../src/ol/source/vectortile';
import _ol_style_Style_ from '../../../../../src/ol/style/style';
import _ol_style_Text_ from '../../../../../src/ol/style/text';
import _ol_tilegrid_ from '../../../../../src/ol/tilegrid';


describe('ol.renderer.canvas.VectorTileLayer', function() {

  describe('constructor', function() {

    var map, layer, source, feature1, feature2, feature3, target, tileCallback;

    beforeEach(function() {
      tileCallback = function() {};
      target = document.createElement('div');
      target.style.width = '256px';
      target.style.height = '256px';
      document.body.appendChild(target);
      map = new _ol_Map_({
        view: new _ol_View_({
          center: [0, 0],
          zoom: 0
        }),
        target: target
      });
      var layerStyle = [new _ol_style_Style_({
        text: new _ol_style_Text_({
          text: 'layer'
        })
      })];
      var featureStyle = [new _ol_style_Style_({
        text: new _ol_style_Text_({
          text: 'feature'
        })
      })];
      feature1 = new _ol_Feature_(new _ol_geom_Point_([1, -1]));
      feature2 = new _ol_Feature_(new _ol_geom_Point_([0, 0]));
      feature3 = new _ol_render_Feature_('Point', [1, -1], []);
      feature2.setStyle(featureStyle);
      var TileClass = function() {
        _ol_VectorTile_.apply(this, arguments);
        this.setState('loaded');
        this.setFeatures([feature1, feature2, feature3]);
        this.setProjection(_ol_proj_.get('EPSG:4326'));
        tileCallback(this);
      };
      _ol_.inherits(TileClass, _ol_VectorTile_);
      source = new _ol_source_VectorTile_({
        format: new _ol_format_MVT_(),
        tileClass: TileClass,
        tileGrid: _ol_tilegrid_.createXYZ()
      });
      source.getTile = function() {
        var tile = _ol_source_VectorTile_.prototype.getTile.apply(source, arguments);
        tile.setState(_ol_TileState_.LOADED);
        return tile;
      };
      layer = new _ol_layer_VectorTile_({
        source: source,
        style: layerStyle
      });
      map.addLayer(layer);
    });

    afterEach(function() {
      document.body.removeChild(target);
      map.dispose();
    });

    it('creates a new instance', function() {
      var renderer = new _ol_renderer_canvas_VectorTileLayer_(layer);
      expect(renderer).to.be.a(_ol_renderer_canvas_VectorTileLayer_);
      expect(renderer.zDirection).to.be(0);
    });

    it('uses lower resolution for pure vector rendering', function() {
      layer.renderMode_ = 'vector';
      var renderer = new _ol_renderer_canvas_VectorTileLayer_(layer);
      expect(renderer.zDirection).to.be(1);
    });

    it('does not render images for pure vector rendering', function() {
      layer.renderMode_ = 'vector';
      var spy = sinon.spy(_ol_renderer_canvas_VectorTileLayer_.prototype,
          'renderTileImage_');
      map.renderSync();
      expect(spy.callCount).to.be(0);
      spy.restore();
    });

    it('does not render replays for pure image rendering', function() {
      layer.renderMode_ = 'image';
      var spy = sinon.spy(_ol_renderer_canvas_VectorTileLayer_.prototype,
          'getTransform');
      map.renderSync();
      expect(spy.callCount).to.be(0);
      spy.restore();
    });

    it('renders both replays and images for hybrid rendering', function() {
      var spy1 = sinon.spy(_ol_renderer_canvas_VectorTileLayer_.prototype,
          'getTransform');
      var spy2 = sinon.spy(_ol_renderer_canvas_VectorTileLayer_.prototype,
          'renderTileImage_');
      map.renderSync();
      expect(spy1.callCount).to.be(1);
      expect(spy2.callCount).to.be(1);
      spy1.restore();
      spy2.restore();
    });

    it('renders replays with custom renderers as direct replays', function() {
      layer.renderMode_ = 'image';
      layer.setStyle(new _ol_style_Style_({
        renderer: function() {}
      }));
      var spy = sinon.spy(_ol_renderer_canvas_VectorTileLayer_.prototype,
          'getTransform');
      map.renderSync();
      expect(spy.callCount).to.be(1);
      spy.restore();
    });

    it('gives precedence to feature styles over layer styles', function() {
      var spy = sinon.spy(map.getRenderer().getLayerRenderer(layer),
          'renderFeature');
      map.renderSync();
      expect(spy.getCall(0).args[2]).to.be(layer.getStyle());
      expect(spy.getCall(1).args[2]).to.be(feature2.getStyle());
      spy.restore();
    });

    it('transforms geometries when tile and view projection are different', function() {
      var tile;
      tileCallback = function(t) {
        tile = t;
      };
      map.renderSync();
      expect(tile.getProjection()).to.equal(_ol_proj_.get('EPSG:3857'));
      expect(feature1.getGeometry().getCoordinates()).to.eql(
          _ol_proj_.fromLonLat([1, -1]));
    });

    it('Geometries are transformed from tile-pixels', function() {
      var proj = new _ol_proj_Projection_({code: 'EPSG:3857', units: 'tile-pixels'});
      var tile;
      tileCallback = function(t) {
        t.setProjection(proj);
        tile = t;
      };
      map.renderSync();
      expect(tile.getProjection()).to.equal(_ol_proj_.get('EPSG:3857'));
      expect(feature1.getGeometry().getCoordinates()).to.eql([-20027724.40316874, 20047292.282409746]);
      expect(feature3.flatCoordinates_).to.eql([-20027724.40316874, 20047292.282409746]);
    });

    it('works for multiple layers that use the same source', function() {
      var layer2 = new _ol_layer_VectorTile_({
        source: source,
        style: new _ol_style_Style_({
          text: new _ol_style_Text_({
            text: 'layer2'
          })
        })
      });
      map.addLayer(layer2);

      var spy1 = sinon.spy(_ol_VectorTile_.prototype,
          'getReplayGroup');
      var spy2 = sinon.spy(_ol_VectorTile_.prototype,
          'setReplayGroup');
      map.renderSync();
      expect(spy1.callCount).to.be(4);
      expect(spy2.callCount).to.be(2);
      spy1.restore();
      spy2.restore();
    });

  });

  describe('#prepareFrame', function() {
    it('re-renders when layer changed', function() {
      var layer = new _ol_layer_VectorTile_({
        source: new _ol_source_VectorTile_({
          tileGrid: _ol_tilegrid_.createXYZ()
        })
      });
      var sourceTile = new _ol_VectorTile_([0, 0, 0], 2);
      sourceTile.setProjection(_ol_proj_.get('EPSG:3857'));
      sourceTile.features_ = [];
      sourceTile.getImage = function() {
        return document.createElement('canvas');
      };
      var tile = new _ol_VectorImageTile_([0, 0, 0]);
      tile.wrappedTileCoord = [0, 0, 0];
      tile.setState(_ol_TileState_.LOADED);
      tile.getSourceTile = function() {
        return sourceTile;
      };
      layer.getSource().getTile = function() {
        return tile;
      };
      var renderer = new _ol_renderer_canvas_VectorTileLayer_(layer);
      renderer.renderTileImage_ = sinon.spy();
      var proj = _ol_proj_.get('EPSG:3857');
      var frameState = {
        extent: proj.getExtent(),
        pixelRatio: 1,
        time: Date.now(),
        viewHints: [],
        viewState: {
          center: [0, 0],
          resolution: 156543.03392804097,
          projection: proj
        },
        size: [256, 256],
        usedTiles: {},
        wantedTiles: {}
      };
      renderer.prepareFrame(frameState, {});
      expect(renderer.renderTileImage_.getCalls().length).to.be(1);
      renderer.prepareFrame(frameState, {});
      expect(renderer.renderTileImage_.getCalls().length).to.be(1);
      layer.changed();
      renderer.prepareFrame(frameState, {});
      expect(renderer.renderTileImage_.getCalls().length).to.be(2);
    });
  });

  describe('#forEachFeatureAtCoordinate', function() {
    var layer, renderer, replayGroup;
    var TileClass = function() {
      _ol_VectorImageTile_.apply(this, arguments);
      this.setState('loaded');
      var sourceTile = new _ol_VectorTile_([0, 0, 0]);
      sourceTile.setProjection(_ol_proj_.get('EPSG:3857'));
      sourceTile.getReplayGroup = function() {
        return replayGroup;
      };
      var key = sourceTile.tileCoord.toString();
      this.tileKeys = [key];
      this.sourceTiles_ = {};
      this.sourceTiles_[key] = sourceTile;
    };
    _ol_.inherits(TileClass, _ol_VectorImageTile_);

    beforeEach(function() {
      replayGroup = {};
      layer = new _ol_layer_VectorTile_({
        source: new _ol_source_VectorTile_({
          tileClass: TileClass,
          tileGrid: _ol_tilegrid_.createXYZ()
        })
      });
      renderer = new _ol_renderer_canvas_VectorTileLayer_(layer);
      replayGroup.forEachFeatureAtCoordinate = function(coordinate,
          resolution, rotation, hitTolerance, skippedFeaturesUids, callback) {
        var feature = new _ol_Feature_();
        callback(feature);
        callback(feature);
      };
    });

    it('calls callback once per feature with a layer as 2nd arg', function() {
      var spy = sinon.spy();
      var coordinate = [0, 0];
      var frameState = {
        layerStates: {},
        skippedFeatureUids: {},
        viewState: {
          projection: _ol_proj_.get('EPSG:3857'),
          resolution: 1,
          rotation: 0
        }
      };
      frameState.layerStates[_ol_.getUid(layer)] = {};
      renderer.renderedTiles = [new TileClass([0, 0, -1])];
      renderer.forEachFeatureAtCoordinate(
          coordinate, frameState, 0, spy, undefined);
      expect(spy.callCount).to.be(1);
      expect(spy.getCall(0).args[1]).to.equal(layer);
    });

    it('does not give false positives when overzoomed', function(done) {
      var target = document.createElement('div');
      target.style.width = '100px';
      target.style.height = '100px';
      document.body.appendChild(target);
      var extent = [1824704.739223726, 6141868.096770482, 1827150.7241288517, 6144314.081675608];
      var source = new _ol_source_VectorTile_({
        format: new _ol_format_MVT_(),
        url: 'spec/ol/data/14-8938-5680.vector.pbf',
        minZoom: 14,
        maxZoom: 14
      });
      var map = new _ol_Map_({
        target: target,
        layers: [
          new _ol_layer_VectorTile_({
            extent: extent,
            source: source
          })
        ],
        view: new _ol_View_({
          center: _ol_extent_.getCenter(extent),
          zoom: 19
        })
      });
      source.on('tileloadend', function() {
        setTimeout(function() {
          var features = map.getFeaturesAtPixel([96, 96]);
          document.body.removeChild(target);
          map.dispose();
          expect(features).to.be(null);
          done();
        }, 200);
      });
    });

  });
});
