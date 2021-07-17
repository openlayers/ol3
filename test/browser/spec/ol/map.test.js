import Control from '../../../../src/ol/control/Control.js';
import DoubleClickZoom from '../../../../src/ol/interaction/DoubleClickZoom.js';
import DragPan from '../../../../src/ol/interaction/DragPan.js';
import Feature from '../../../../src/ol/Feature.js';
import GeoJSON from '../../../../src/ol/format/GeoJSON.js';
import ImageLayer from '../../../../src/ol/layer/Image.js';
import ImageState from '../../../../src/ol/ImageState.js';
import ImageStatic from '../../../../src/ol/source/ImageStatic.js';
import Interaction from '../../../../src/ol/interaction/Interaction.js';
import Map from '../../../../src/ol/Map.js';
import MapBrowserEvent from '../../../../src/ol/MapBrowserEvent.js';
import MapEvent from '../../../../src/ol/MapEvent.js';
import MouseWheelZoom from '../../../../src/ol/interaction/MouseWheelZoom.js';
import Overlay from '../../../../src/ol/Overlay.js';
import PinchZoom from '../../../../src/ol/interaction/PinchZoom.js';
import Select from '../../../../src/ol/interaction/Select.js';
import TileLayer from '../../../../src/ol/layer/Tile.js';
import TileLayerRenderer from '../../../../src/ol/renderer/canvas/TileLayer.js';
import VectorLayer from '../../../../src/ol/layer/Vector.js';
import VectorSource from '../../../../src/ol/source/Vector.js';
import View from '../../../../src/ol/View.js';
import XYZ from '../../../../src/ol/source/XYZ.js';
import {LineString, Point, Polygon} from '../../../../src/ol/geom.js';
import {TRUE} from '../../../../src/ol/functions.js';
import {
  clearUserProjection,
  fromLonLat,
  get as getProjection,
  transform,
  useGeographic,
} from '../../../../src/ol/proj.js';
import {createXYZ} from '../../../../src/ol/tilegrid.js';
import {defaults as defaultInteractions} from '../../../../src/ol/interaction.js';
import {tile as tileStrategy} from '../../../../src/ol/loadingstrategy.js';

describe('ol.Map', function () {
  describe('constructor', function () {
    it('creates a new map', function () {
      const map = new Map({});
      expect(map).to.be.a(Map);
    });

    it('creates a set of default interactions', function () {
      const map = new Map({});
      const interactions = map.getInteractions();
      const length = interactions.getLength();
      expect(length).to.be.greaterThan(0);

      for (let i = 0; i < length; ++i) {
        expect(interactions.item(i).getMap()).to.be(map);
      }
    });

    it('creates the viewport', function () {
      const map = new Map({});
      const viewport = map.getViewport();
      const className =
        'ol-viewport' + ('ontouchstart' in window ? ' ol-touch' : '');
      expect(viewport.className).to.be(className);
    });

    it('creates the overlay containers', function () {
      const map = new Map({});
      const container = map.getOverlayContainer();
      expect(container.className).to.be('ol-overlaycontainer');

      const containerStop = map.getOverlayContainerStopEvent();
      expect(containerStop.className).to.be('ol-overlaycontainer-stopevent');
    });

    it('calls setMap for controls added by other controls', function () {
      let subSetMapCalled = false;
      class SubControl extends Control {
        setMap(map) {
          super.setMap(map);
          subSetMapCalled = true;
        }
      }
      class MainControl extends Control {
        setMap(map) {
          super.setMap(map);
          map.addControl(
            new SubControl({
              element: document.createElement('div'),
            })
          );
        }
      }
      new Map({
        target: document.createElement('div'),
        controls: [
          new MainControl({
            element: document.createElement('div'),
          }),
        ],
      });
      expect(subSetMapCalled).to.be(true);
    });
  });

  describe('#addLayer()', function () {
    it('adds a layer to the map', function () {
      const map = new Map({});
      const layer = new TileLayer();
      map.addLayer(layer);

      expect(map.getLayers().item(0)).to.be(layer);
    });

    it('throws if a layer is added twice', function () {
      const map = new Map({});
      const layer = new TileLayer();
      map.addLayer(layer);

      const call = function () {
        map.addLayer(layer);
      };
      expect(call).to.throwException();
    });
  });

  describe('#addInteraction()', function () {
    it('adds an interaction to the map', function () {
      const map = new Map({});
      const interaction = new Interaction({});

      const before = map.getInteractions().getLength();
      map.addInteraction(interaction);
      const after = map.getInteractions().getLength();
      expect(after).to.be(before + 1);
      expect(interaction.getMap()).to.be(map);
    });
  });

  describe('#removeInteraction()', function () {
    it('removes an interaction from the map', function () {
      const map = new Map({});
      const interaction = new Interaction({});

      const before = map.getInteractions().getLength();
      map.addInteraction(interaction);

      map.removeInteraction(interaction);
      expect(map.getInteractions().getLength()).to.be(before);

      expect(interaction.getMap()).to.be(null);
    });
  });

  describe('movestart/moveend event', function () {
    let target, view, map;

    beforeEach(function () {
      target = document.createElement('div');

      const style = target.style;
      style.position = 'absolute';
      style.left = '-1000px';
      style.top = '-1000px';
      style.width = '360px';
      style.height = '180px';
      document.body.appendChild(target);

      view = new View({
        projection: 'EPSG:4326',
      });
      map = new Map({
        target: target,
        view: view,
        layers: [
          new TileLayer({
            source: new XYZ({
              url: '#{x}/{y}/{z}',
            }),
          }),
        ],
      });
    });

    afterEach(function () {
      map.dispose();
      document.body.removeChild(target);
    });

    it('are fired only once after view changes', function (done) {
      const center = [10, 20];
      const zoom = 3;
      let startCalls = 0;
      let endCalls = 0;
      map.on('movestart', function () {
        ++startCalls;
        expect(startCalls).to.be(1);
      });
      map.on('moveend', function () {
        ++endCalls;
        expect(endCalls).to.be(1);
        expect(view.getCenter()).to.eql(center);
        expect(view.getZoom()).to.be(zoom);
        window.setTimeout(done, 1000);
      });

      view.setCenter(center);
      view.setZoom(zoom);
    });

    it('are fired in sequence', function (done) {
      view.setCenter([0, 0]);
      view.setResolution(0.703125);
      map.renderSync();
      const center = [10, 20];
      const zoom = 3;
      const calls = [];
      map.on('movestart', function (e) {
        calls.push('start');
        expect(calls).to.eql(['start']);
        expect(e.frameState.viewState.center).to.eql([0, 0]);
        expect(e.frameState.viewState.resolution).to.be(0.703125);
      });
      map.on('moveend', function () {
        calls.push('end');
        expect(calls).to.eql(['start', 'end']);
        expect(view.getCenter()).to.eql(center);
        expect(view.getZoom()).to.be(zoom);
        done();
      });

      view.setCenter(center);
      view.setZoom(zoom);
    });
  });

  describe('rendercomplete event', function () {
    let map;
    beforeEach(function () {
      const target = document.createElement('div');
      target.style.width = '100px';
      target.style.height = '100px';
      document.body.appendChild(target);
      map = new Map({
        target: target,
        layers: [
          new TileLayer({
            opacity: 0.5,
            source: new XYZ({
              url: 'spec/ol/data/osm-{z}-{x}-{y}.png',
            }),
          }),
          new ImageLayer({
            source: new ImageStatic({
              url: 'spec/ol/data/osm-0-0-0.png',
              imageExtent: getProjection('EPSG:3857').getExtent(),
              projection: 'EPSG:3857',
            }),
          }),
          new VectorLayer({
            source: new VectorSource({
              url: 'spec/ol/data/point.json',
              format: new GeoJSON(),
            }),
          }),
          new VectorLayer({
            source: new VectorSource({
              url: 'spec/ol/data/point.json',
              format: new GeoJSON(),
              strategy: tileStrategy(createXYZ()),
            }),
          }),
          new VectorLayer({
            source: new VectorSource({
              features: [new Feature(new Point([0, 0]))],
            }),
          }),
          new VectorLayer({
            source: new VectorSource({
              loader: function (extent, resolution, projection) {
                this.addFeature(new Feature(new Point([0, 0])));
              },
            }),
          }),
        ],
      });
    });

    afterEach(function () {
      document.body.removeChild(map.getTargetElement());
      map.setTarget(null);
      map.dispose();
    });

    it('triggers when all tiles and sources are loaded and faded in', function (done) {
      map.once('rendercomplete', function () {
        const layers = map.getLayers().getArray();
        expect(map.tileQueue_.getTilesLoading()).to.be(0);
        expect(layers[1].getSource().image_.getState()).to.be(
          ImageState.LOADED
        );
        expect(layers[2].getSource().getFeatures().length).to.be(1);
        done();
      });
      map.setView(
        new View({
          center: [0, 0],
          zoom: 0,
        })
      );
    });
  });

  describe('#getFeaturesAtPixel', function () {
    let target, map, layer;
    beforeEach(function () {
      target = document.createElement('div');
      target.style.width = '100px';
      target.style.height = '100px';
      document.body.appendChild(target);
      layer = new VectorLayer({
        source: new VectorSource({
          features: [
            new Feature(
              new LineString([
                [-50, 0],
                [50, 0],
              ])
            ),
          ],
        }),
      });
      map = new Map({
        target: target,
        layers: [layer],
        view: new View({
          center: [0, 0],
          zoom: 17,
        }),
      });
      map.renderSync();
    });
    afterEach(function () {
      document.body.removeChild(target);
    });

    it('returns an empty array if no feature was found', function () {
      const features = map.getFeaturesAtPixel([0, 0]);
      expect(features).to.be.an(Array);
      expect(features).to.be.empty();
    });

    it('returns an array of found features', function () {
      const features = map.getFeaturesAtPixel([50, 50]);
      expect(features).to.be.an(Array);
      expect(features[0]).to.be.an(Feature);
    });

    it('returns an array of found features with declutter: true', function () {
      const layer = map.getLayers().item(0);
      map.removeLayer(layer);
      const otherLayer = new VectorLayer({
        declutter: true,
        source: layer.getSource(),
      });
      map.addLayer(otherLayer);
      map.renderSync();
      const features = map.getFeaturesAtPixel([50, 50]);
      expect(features).to.be.an(Array);
      expect(features[0]).to.be.a(Feature);
    });

    it('respects options', function () {
      const otherLayer = new VectorLayer({
        source: new VectorSource(),
      });
      map.addLayer(otherLayer);
      map.renderSync();
      const features = map.getFeaturesAtPixel([50, 50], {
        layerFilter: function (layer) {
          return layer === otherLayer;
        },
      });
      expect(features).to.be.an(Array);
      expect(features).to.be.empty();
    });

    it('finds off-world geometries', function () {
      const line1 = new LineString([
        [130, 0],
        [230, 0],
      ]);
      line1.transform('EPSG:4326', 'EPSG:3857');
      const line2 = new LineString([
        [-230, 0],
        [-130, 0],
      ]);
      line2.transform('EPSG:4326', 'EPSG:3857');
      layer.getSource().addFeature(new Feature(line1));
      layer.getSource().addFeature(new Feature(line2));
      map.getView().setCenter(fromLonLat([180, 0]));
      map.renderSync();

      let features = map.getFeaturesAtPixel([60, 50]);
      expect(features).to.be.an(Array);
      expect(features.length).to.be(2);

      features = map.getFeaturesAtPixel([60, 50], {checkWrapped: false});
      expect(features).to.be.an(Array);
      expect(features.length).to.be(1);

      map.getView().setCenter(fromLonLat([-180, 0]));
      map.renderSync();

      features = map.getFeaturesAtPixel([40, 50]);
      expect(features).to.be.an(Array);
      expect(features.length).to.be(2);

      features = map.getFeaturesAtPixel([40, 50], {checkWrapped: false});
      expect(features).to.be.an(Array);
      expect(features.length).to.be(1);
    });
  });

  describe('#getFeaturesAtPixel - useGeographic', function () {
    let target, map;
    const size = 256;
    beforeEach(function () {
      useGeographic();

      target = document.createElement('div');
      target.style.width = size + 'px';
      target.style.height = size + 'px';
      document.body.appendChild(target);

      map = new Map({
        target: target,
        layers: [
          new VectorLayer({
            source: new VectorSource({
              features: [
                new Feature(
                  new Polygon([
                    [
                      [-100, 40],
                      [-90, 40],
                      [-90, 50],
                      [-100, 50],
                      [-100, 40],
                    ],
                  ])
                ),
              ],
            }),
          }),
        ],
        view: new View({
          center: [0, 0],
          zoom: 0,
        }),
      });
      map.renderSync();
    });

    afterEach(function () {
      clearUserProjection();
      document.body.removeChild(target);
    });

    it('returns an empty array if no feature was found', function () {
      const features = map.getFeaturesAtPixel([size / 2, size / 2]);
      expect(features).to.be.an(Array);
      expect(features).to.be.empty();
    });

    it('returns an array of found features', function () {
      const coordinate = [-95, 45];
      const pixel = map.getPixelFromCoordinate(coordinate);
      const features = map.getFeaturesAtPixel(pixel);
      expect(features).to.be.an(Array);
      expect(features[0]).to.be.a(Feature);
    });
  });

  describe('#hasFeatureAtPixel - useGeographic', function () {
    let target, map;
    const size = 256;
    beforeEach(function () {
      useGeographic();

      target = document.createElement('div');
      target.style.width = size + 'px';
      target.style.height = size + 'px';
      document.body.appendChild(target);

      map = new Map({
        target: target,
        layers: [
          new VectorLayer({
            source: new VectorSource({
              features: [
                new Feature(
                  new Polygon([
                    [
                      [-100, 40],
                      [-90, 40],
                      [-90, 50],
                      [-100, 50],
                      [-100, 40],
                    ],
                  ])
                ),
              ],
            }),
          }),
        ],
        view: new View({
          center: [0, 0],
          zoom: 0,
        }),
      });
      map.renderSync();
    });

    afterEach(function () {
      clearUserProjection();
      document.body.removeChild(target);
    });

    it('returns false if no feature was found', function () {
      const has = map.hasFeatureAtPixel([size / 2, size / 2]);
      expect(has).to.be(false);
    });

    it('returns true if there are features found', function () {
      const coordinate = [-95, 45];
      const pixel = map.getPixelFromCoordinate(coordinate);
      const has = map.hasFeatureAtPixel(pixel);
      expect(has).to.be(true);
    });
  });

  describe('#forEachLayerAtPixel()', function () {
    let target, map, original, log;

    beforeEach(function (done) {
      log = [];
      original = TileLayerRenderer.prototype.getDataAtPixel;
      TileLayerRenderer.prototype.getDataAtPixel = function (pixel) {
        log.push(pixel.slice());
      };

      target = document.createElement('div');
      const style = target.style;
      style.position = 'absolute';
      style.left = '-1000px';
      style.top = '-1000px';
      style.width = '360px';
      style.height = '180px';
      document.body.appendChild(target);

      map = new Map({
        target: target,
        view: new View({
          center: [0, 0],
          zoom: 1,
        }),
        layers: [
          new TileLayer({
            source: new XYZ(),
          }),
          new TileLayer({
            source: new XYZ(),
          }),
          new TileLayer({
            source: new XYZ(),
          }),
        ],
      });

      map.once('postrender', function () {
        done();
      });
    });

    afterEach(function () {
      TileLayerRenderer.prototype.getDataAtPixel = original;
      map.dispose();
      document.body.removeChild(target);
      log = null;
    });

    it('calls each layer renderer with the same pixel', function () {
      const pixel = [10, 20];
      map.forEachLayerAtPixel(pixel, function () {});
      expect(log.length).to.equal(3);
      expect(log[0].length).to.equal(2);
      expect(log[0]).to.eql(log[1]);
      expect(log[1]).to.eql(log[2]);
    });
  });

  describe('#render()', function () {
    let target, map;

    beforeEach(function () {
      target = document.createElement('div');
      const style = target.style;
      style.position = 'absolute';
      style.left = '-1000px';
      style.top = '-1000px';
      style.width = '360px';
      style.height = '180px';
      document.body.appendChild(target);
      map = new Map({
        target: target,
        view: new View({
          projection: 'EPSG:4326',
          center: [0, 0],
          resolution: 1,
        }),
      });
    });

    afterEach(function () {
      map.dispose();
      document.body.removeChild(target);
    });

    it('is called when the view.changed() is called', function () {
      const view = map.getView();

      const spy = sinon.spy(map, 'render');
      view.changed();
      expect(spy.callCount).to.be(1);
    });

    it('is not called on view changes after the view has been removed', function () {
      const view = map.getView();
      map.setView(null);

      const spy = sinon.spy(map, 'render');
      view.changed();
      expect(spy.callCount).to.be(0);
    });

    it('calls renderFrame_ and results in an postrender event', function (done) {
      const spy = sinon.spy(map, 'renderFrame_');
      map.render();
      map.once('postrender', function (event) {
        expect(event).to.be.a(MapEvent);
        expect(typeof spy.firstCall.args[0]).to.be('number');
        spy.restore();
        const frameState = event.frameState;
        expect(frameState).not.to.be(null);
        done();
      });
    });

    it('uses the same render frame for subsequent calls', function (done) {
      map.render();
      const id1 = map.animationDelayKey_;
      let id2 = null;
      map.once('postrender', function () {
        expect(id2).to.be(id1);
        done();
      });
      map.render();
      id2 = map.animationDelayKey_;
    });

    it('creates a new render frame after renderSync()', function (done) {
      let id2 = null;
      map.render();
      const id1 = map.animationDelayKey_;
      map.once('postrender', function () {
        expect(id2).to.not.be(id1);
        done();
      });
      map.renderSync();
      id2 = map.animationDelayKey_;
    });

    it('results in an postrender event (for zero height map)', function (done) {
      target.style.height = '0px';
      map.updateSize();

      map.render();
      map.once('postrender', function (event) {
        expect(event).to.be.a(MapEvent);
        const frameState = event.frameState;
        expect(frameState).to.be(null);
        done();
      });
    });

    it('results in an postrender event (for zero width map)', function (done) {
      target.style.width = '0px';
      map.updateSize();

      map.render();
      map.once('postrender', function (event) {
        expect(event).to.be.a(MapEvent);
        const frameState = event.frameState;
        expect(frameState).to.be(null);
        done();
      });
    });
  });

  describe('dispose', function () {
    let map;

    beforeEach(function () {
      map = new Map({
        target: document.createElement('div'),
      });
    });

    it('removes the viewport from its parent', function () {
      map.dispose();
      expect(map.getViewport().parentNode).to.be(null);
    });

    it('removes window listeners', function () {
      map.dispose();
      expect(map.handleResize_).to.be(undefined);
    });
  });

  describe('#setTarget', function () {
    /** @type {Map|undefined} */
    let map;

    beforeEach(function () {
      map = new Map({
        target: document.createElement('div'),
      });
      expect(map.handleResize_).to.be.ok();
    });

    describe('map with target not attached to dom', function () {
      it('has undefined as size with target not in document', function () {
        expect(map.getSize()).to.be(undefined);
      });
    });

    describe('call setTarget with null', function () {
      it('unregisters the viewport resize listener', function () {
        map.setTarget(null);
        expect(map.handleResize_).to.be(undefined);
      });
    });

    describe('call setTarget with an element', function () {
      it('registers a viewport resize listener', function () {
        map.setTarget(null);
        map.setTarget(document.createElement('div'));
        expect(map.handleResize_).to.be.ok();
      });
    });
  });

  describe('create interactions', function () {
    let options, event, hasTabIndex, hasFocus, isPrimary;

    beforeEach(function () {
      options = {
        altShiftDragRotate: false,
        doubleClickZoom: false,
        keyboard: false,
        mouseWheelZoom: false,
        shiftDragZoom: false,
        dragPan: false,
        pinchRotate: false,
        pinchZoom: false,
      };
      hasTabIndex = true;
      hasFocus = true;
      isPrimary = true;
      event = {
        map: {
          getTargetElement: function () {
            return {
              hasAttribute: function (attribute) {
                return hasTabIndex;
              },
            };
          },
        },
        originalEvent: {
          isPrimary: isPrimary,
          button: 0,
        },
        target: {
          getTargetElement: function () {
            return {
              contains: function () {
                return hasFocus;
              },
            };
          },
        },
      };
    });

    describe('create mousewheel interaction', function () {
      it('creates mousewheel interaction', function () {
        options.mouseWheelZoom = true;
        const interactions = defaultInteractions(options);
        expect(interactions.getLength()).to.eql(1);
        expect(interactions.item(0)).to.be.a(MouseWheelZoom);
        expect(interactions.item(0).useAnchor_).to.eql(true);
        interactions.item(0).setMouseAnchor(false);
        expect(interactions.item(0).useAnchor_).to.eql(false);
        expect(interactions.item(0).condition_).to.be(TRUE);
      });
      it('does not use the default condition when onFocusOnly option is set', function () {
        options.onFocusOnly = true;
        options.mouseWheelZoom = true;
        const interactions = defaultInteractions(options);
        expect(interactions.item(0).condition_).to.not.be(TRUE);
        hasTabIndex = true;
        hasFocus = true;
        expect(interactions.item(0).condition_(event)).to.be(true);
        hasTabIndex = true;
        hasFocus = false;
        expect(interactions.item(0).condition_(event)).to.be(false);
        hasTabIndex = false;
        expect(interactions.item(0).condition_(event)).to.be(true);
      });
    });

    describe('create dragpan interaction', function () {
      it('creates dragpan interaction', function () {
        options.dragPan = true;
        const interactions = defaultInteractions(options);
        expect(interactions.getLength()).to.eql(1);
        expect(interactions.item(0)).to.be.a(DragPan);
        expect(interactions.item(0).condition_(event)).to.be(true);
        hasTabIndex = true;
        hasFocus = false;
        expect(interactions.item(0).condition_(event)).to.be(true);
        event.originalEvent.altKey = true;
        expect(interactions.item(0).condition_(event)).to.be(false);
        delete event.originalEvent.altKey;
        event.originalEvent.button = 1;
        expect(interactions.item(0).condition_(event)).to.be(false);
      });
      it('does not use the default condition when onFocusOnly option is set', function () {
        options.onFocusOnly = true;
        options.dragPan = true;
        const interactions = defaultInteractions(options);
        hasTabIndex = true;
        hasFocus = true;
        expect(interactions.item(0).condition_(event)).to.be(true);
        hasTabIndex = true;
        hasFocus = false;
        expect(interactions.item(0).condition_(event)).to.be(false);
        hasTabIndex = false;
        expect(interactions.item(0).condition_(event)).to.be(true);
      });
    });

    describe('create pinchZoom interaction', function () {
      it('creates pinchZoom interaction', function () {
        options.pinchZoom = true;
        const interactions = defaultInteractions(options);
        expect(interactions.getLength()).to.eql(1);
        expect(interactions.item(0)).to.be.a(PinchZoom);
      });
    });

    describe('create double click interaction', function () {
      beforeEach(function () {
        options.doubleClickZoom = true;
      });

      describe('default zoomDelta', function () {
        it('create double click interaction with default delta', function () {
          const interactions = defaultInteractions(options);
          expect(interactions.getLength()).to.eql(1);
          expect(interactions.item(0)).to.be.a(DoubleClickZoom);
          expect(interactions.item(0).delta_).to.eql(1);
        });
      });

      describe('set zoomDelta', function () {
        it('create double click interaction with set delta', function () {
          options.zoomDelta = 7;
          const interactions = defaultInteractions(options);
          expect(interactions.getLength()).to.eql(1);
          expect(interactions.item(0)).to.be.a(DoubleClickZoom);
          expect(interactions.item(0).delta_).to.eql(7);
        });
      });
    });

    describe('#getEventPixel', function () {
      let target;

      beforeEach(function () {
        target = document.createElement('div');
        target.style.position = 'absolute';
        target.style.top = '10px';
        target.style.left = '20px';
        target.style.width = '800px';
        target.style.height = '400px';

        document.body.appendChild(target);
      });
      afterEach(function () {
        document.body.removeChild(target);
      });

      it('works with touchend events', function () {
        const map = new Map({
          target: target,
        });

        const browserEvent = {
          type: 'touchend',
          target: target,
          changedTouches: [
            {
              clientX: 100,
              clientY: 200,
            },
          ],
        };
        const position = map.getEventPixel(browserEvent);
        // 80 = clientX - target.style.left
        expect(position[0]).to.eql(80);
        // 190 = clientY - target.style.top
        expect(position[1]).to.eql(190);
      });
    });

    describe('#getOverlayById()', function () {
      let target, map, overlay, overlay_target;

      beforeEach(function () {
        target = document.createElement('div');
        const style = target.style;
        style.position = 'absolute';
        style.left = '-1000px';
        style.top = '-1000px';
        style.width = '360px';
        style.height = '180px';
        document.body.appendChild(target);
        map = new Map({
          target: target,
          view: new View({
            projection: 'EPSG:4326',
            center: [0, 0],
            resolution: 1,
          }),
        });
        overlay_target = document.createElement('div');
      });

      afterEach(function () {
        map.removeOverlay(overlay);
        map.dispose();
        document.body.removeChild(target);
      });

      it('returns an overlay by id', function () {
        overlay = new Overlay({
          id: 'foo',
          element: overlay_target,
          position: [0, 0],
        });
        map.addOverlay(overlay);
        expect(map.getOverlayById('foo')).to.be(overlay);
      });

      it('returns null when no overlay is found', function () {
        overlay = new Overlay({
          id: 'foo',
          element: overlay_target,
          position: [0, 0],
        });
        map.addOverlay(overlay);
        expect(map.getOverlayById('bar')).to.be(null);
      });

      it('returns null after removing overlay', function () {
        overlay = new Overlay({
          id: 'foo',
          element: overlay_target,
          position: [0, 0],
        });
        map.addOverlay(overlay);
        expect(map.getOverlayById('foo')).to.be(overlay);
        map.removeOverlay(overlay);
        expect(map.getOverlayById('foo')).to.be(null);
      });
    });

    describe('getCoordinateFromPixel() and getPixelFromCoordinate()', function () {
      let target, view, map;
      const centerGeographic = [2.460938, 48.850258];
      const centerMercator = transform(
        centerGeographic,
        getProjection('EPSG:4326'),
        getProjection('EPSG:3857')
      );
      const screenCenter = [500, 500];

      beforeEach(function () {
        target = document.createElement('div');

        const style = target.style;
        style.position = 'absolute';
        style.left = '-1000px';
        style.top = '-1000px';
        style.width = `${screenCenter[0] * 2}px`;
        style.height = `${screenCenter[1] * 2}px`;
        document.body.appendChild(target);

        useGeographic();

        view = new View({
          center: centerGeographic,
          zoom: 3,
        });
        map = new Map({
          target: target,
          view: view,
          layers: [
            new TileLayer({
              source: new XYZ({
                url: '#{x}/{y}/{z}',
              }),
            }),
          ],
        });
      });

      afterEach(function () {
        map.dispose();
        document.body.removeChild(target);
        clearUserProjection();
      });

      it('gets coordinates in user projection', function (done) {
        map.renderSync();
        const coordinateGeographic = map.getCoordinateFromPixel(screenCenter);
        expect(coordinateGeographic[0]).to.roughlyEqual(
          centerGeographic[0],
          1e-5
        );
        expect(coordinateGeographic[1]).to.roughlyEqual(
          centerGeographic[1],
          1e-5
        );
        done();
      });

      it('gets coordinates in view projection', function (done) {
        map.renderSync();
        const coordinateMercator =
          map.getCoordinateFromPixelInternal(screenCenter);
        expect(coordinateMercator[0]).to.roughlyEqual(centerMercator[0], 1e-5);
        expect(coordinateMercator[1]).to.roughlyEqual(centerMercator[1], 1e-5);
        done();
      });

      it('gets pixel from coordinates in user projection', function (done) {
        map.renderSync();
        const pixel = map.getPixelFromCoordinate(centerGeographic);
        expect(pixel).to.eql(screenCenter);
        done();
      });

      it('gets pixel from coordinates in view projection', function (done) {
        map.renderSync();
        const pixel = map.getPixelFromCoordinateInternal(centerMercator);
        expect(pixel).to.eql(screenCenter);
        done();
      });
    });
  });

  describe('#handleMapBrowserEvent()', function () {
    let map, target, dragpan;
    beforeEach(function () {
      target = document.createElement('div');
      target.style.width = '100px';
      target.style.height = '100px';
      document.body.appendChild(target);
      dragpan = new DragPan();
      map = new Map({
        target: target,
        interactions: [dragpan],
        layers: [
          new TileLayer({
            source: new XYZ({
              url: 'spec/ol/data/osm-{z}-{x}-{y}.png',
            }),
          }),
        ],
        view: new View({
          zoom: 0,
          center: [0, 0],
        }),
      });
      map.renderSync();
    });

    afterEach(function () {
      map.setTarget(null);
      document.body.removeChild(target);
    });

    it('calls handleEvent on interaction', function () {
      const spy = sinon.spy(dragpan, 'handleEvent');
      map.handleMapBrowserEvent(
        new MapBrowserEvent('pointermove', map, new PointerEvent('pointermove'))
      );
      expect(spy.callCount).to.be(1);
      spy.restore();
    });

    it('does not call handleEvent on interaction when map has no target', function () {
      map.setTarget(null);
      const spy = sinon.spy(dragpan, 'handleEvent');
      map.handleMapBrowserEvent(
        new MapBrowserEvent('pointermove', map, new PointerEvent('pointermove'))
      );
      expect(spy.callCount).to.be(0);
      spy.restore();
    });

    it('does not call handleEvent on interaction that has been removed', function () {
      const spy = sinon.spy(dragpan, 'handleEvent');
      let callCount = 0;
      const interaction = new Interaction({
        handleEvent: function () {
          ++callCount;
          map.removeInteraction(dragpan);
          return true;
        },
      });
      map.addInteraction(interaction);
      map.handleMapBrowserEvent(
        new MapBrowserEvent('pointermove', map, new PointerEvent('pointermove'))
      );
      expect(callCount).to.be(1);
      expect(spy.callCount).to.be(0);
      spy.restore();
    });

    it('does not call handleEvent on interaction when MapBrowserEvent propagation stopped', function () {
      const select = new Select();
      const selectStub = sinon.stub(select, 'handleEvent');
      selectStub.callsFake(function (e) {
        e.stopPropagation();
        return true;
      });
      map.addInteraction(select);
      const spy = sinon.spy(dragpan, 'handleEvent');
      map.handleMapBrowserEvent(
        new MapBrowserEvent('pointermove', map, new PointerEvent('pointermove'))
      );
      expect(spy.callCount).to.be(0);
      expect(selectStub.callCount).to.be(1);
      spy.restore();
      selectStub.restore();
    });
  });
});
