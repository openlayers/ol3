import Map from '../../../../../src/ol/Map.js';
import View from '../../../../../src/ol/View.js';
import {get as getProj} from '../../../../../src/ol/proj.js';
import ImageLayer from '../../../../../src/ol/layer/Image.js';
import VectorImageLayer from '../../../../../src/ol/layer/VectorImage.js';
import Feature from '../../../../../src/ol/Feature.js';
import Point from '../../../../../src/ol/geom/Point.js';
import Projection from '../../../../../src/ol/proj/Projection.js';
import Static from '../../../../../src/ol/source/ImageStatic.js';
import VectorSource from '../../../../../src/ol/source/Vector.js';


describe('ol.renderer.canvas.ImageLayer', () => {

  describe('#forEachLayerAtCoordinate', () => {

    let map, target, source;
    beforeEach(done => {
      const projection = new Projection({
        code: 'custom-image',
        units: 'pixels',
        extent: [0, 0, 200, 200]
      });
      target = document.createElement('div');
      target.style.width = '100px';
      target.style.height = '100px';
      document.body.appendChild(target);
      source = new Static({
        url: 'spec/ol/data/dot.png',
        projection: projection,
        imageExtent: [0, 0, 20, 20]
      });
      map = new Map({
        pixelRatio: 1,
        target: target,
        layers: [new ImageLayer({
          source: source
        })],
        view: new View({
          projection: projection,
          center: [10, 10],
          zoom: 2,
          maxZoom: 8
        })
      });
      source.on('imageloadend', function() {
        done();
      });
    });

    afterEach(() => {
      map.setTarget(null);
      document.body.removeChild(target);
    });

    test('properly detects pixels', () => {
      map.renderSync();
      let has = false;
      function hasLayer() {
        has = true;
      }
      map.forEachLayerAtPixel([20, 80], hasLayer);
      expect(has).toBe(true);
      has = false;
      map.forEachLayerAtPixel([10, 90], hasLayer);
      expect(has).toBe(false);
    });
  });

  describe('Image rendering', () => {
    let map, div, layer;

    beforeEach(done => {
      const projection = getProj('EPSG:3857');
      layer = new ImageLayer({
        source: new Static({
          url: 'spec/ol/data/osm-0-0-0.png',
          imageExtent: projection.getExtent(),
          projection: projection
        })
      });

      div = document.createElement('div');
      div.style.width = div.style.height = '100px';
      document.body.appendChild(div);
      map = new Map({
        target: div,
        layers: [layer],
        view: new View({
          center: [0, 0],
          zoom: 2
        })
      });
      layer.getSource().on('imageloadend', function() {
        done();
      });
    });

    afterEach(() => {
      map.setTarget(null);
      document.body.removeChild(div);
      map.dispose();
    });

    test(
      'dispatches prerender and postrender events on the image layer',
      done => {
        let prerender = 0;
        let postrender = 0;
        layer.on('prerender', function() {
          ++prerender;
        });
        layer.on('postrender', function() {
          ++postrender;
        });
        map.on('postrender', function() {
          expect(prerender).toBe(1);
          expect(postrender).toBe(1);
          done();
        });
      }
    );
  });


  describe('Vector image rendering', () => {
    let map, div, layer;

    beforeEach(() => {
      layer = new VectorImageLayer({
        source: new VectorSource({
          features: [new Feature(new Point([0, 0]))]
        })
      });

      div = document.createElement('div');
      div.style.width = div.style.height = '100px';
      document.body.appendChild(div);
      map = new Map({
        target: div,
        layers: [layer],
        view: new View({
          center: [0, 0],
          zoom: 2
        })
      });
    });

    afterEach(() => {
      map.setTarget(null);
      document.body.removeChild(div);
      map.dispose();
    });

    test(
      'dispatches prerender and postrender events on the vector layer',
      done => {
        let prerender = 0;
        let postrender = 0;
        layer.on('prerender', function() {
          ++prerender;
        });
        layer.on('postrender', function() {
          ++postrender;
        });
        map.once('postrender', function() {
          expect(prerender).toBe(1);
          expect(postrender).toBe(1);
          done();
        });
      }
    );
  });

});
