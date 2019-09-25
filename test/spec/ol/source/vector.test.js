import {listen} from '../../../../src/ol/events.js';
import Collection from '../../../../src/ol/Collection.js';
import Feature from '../../../../src/ol/Feature.js';
import Map from '../../../../src/ol/Map.js';
import View from '../../../../src/ol/View.js';
import Point from '../../../../src/ol/geom/Point.js';
import LineString from '../../../../src/ol/geom/LineString.js';
import VectorLayer from '../../../../src/ol/layer/Vector.js';
import {bbox as bboxStrategy} from '../../../../src/ol/loadingstrategy.js';
import {get as getProjection, transformExtent, fromLonLat} from '../../../../src/ol/proj.js';
import VectorSource from '../../../../src/ol/source/Vector.js';
import GeoJSON from '../../../../src/ol/format/GeoJSON.js';
import {getUid} from '../../../../src/ol/util.js';


describe('ol.source.Vector', () => {

  let pointFeature;
  let infiniteExtent;
  beforeEach(() => {
    pointFeature = new Feature(new Point([0, 0]));
    infiniteExtent = [-Infinity, -Infinity, Infinity, Infinity];
  });

  describe('when empty', () => {

    let vectorSource;
    beforeEach(() => {
      vectorSource = new VectorSource();
    });

    describe('#forEachFeatureInExtent', () => {

      test('does not call the callback', () => {
        const f = sinon.spy();
        vectorSource.forEachFeatureInExtent(infiniteExtent, f);
        expect(f).not.to.be.called();
      });

    });

    describe('#getFeaturesInExtent', () => {

      test('returns an empty array', () => {
        const features = vectorSource.getFeaturesInExtent(infiniteExtent);
        expect(features).toBeInstanceOf(Array);
        expect(features).toHaveLength(0);
      });

    });

    describe('#isEmpty', () => {

      test('returns true', () => {
        expect(vectorSource.isEmpty()).toBe(true);
      });

    });

    describe('#addFeature', () => {

      test('can add a single point feature', () => {
        vectorSource.addFeature(pointFeature);
        const features = vectorSource.getFeaturesInExtent(infiniteExtent);
        expect(features).toBeInstanceOf(Array);
        expect(features).toHaveLength(1);
        expect(features[0]).toBe(pointFeature);
      });

      test('fires a change event', () => {
        const listener = sinon.spy();
        listen(vectorSource, 'change', listener);
        vectorSource.addFeature(pointFeature);
        expect(listener).to.be.called();
      });

      test('adds same id features only once', () => {
        const source = new VectorSource();
        const feature1 = new Feature();
        feature1.setId('1');
        const feature2 = new Feature();
        feature2.setId('1');
        source.addFeature(feature1);
        source.addFeature(feature2);
        expect(source.getFeatures().length).toBe(1);
      });

    });

    describe('#hasFeature', () => {

      test('returns true for added feature without id', () => {
        const feature = new Feature();
        vectorSource.addFeature(feature);
        expect(vectorSource.hasFeature(feature)).toBe(true);
      });

      test('returns true for added feature with id', () => {
        const feature = new Feature();
        feature.setId('1');
        vectorSource.addFeature(feature);
        expect(vectorSource.hasFeature(feature)).toBe(true);
      });

      test('return false for removed feature', () => {
        const feature = new Feature();
        vectorSource.addFeature(feature);
        vectorSource.removeFeature(feature);
        expect(vectorSource.hasFeature(feature)).toBe(false);
      });

      test('returns false for non-added feature', () => {
        const feature = new Feature();
        expect(vectorSource.hasFeature(feature)).toBe(false);
      });

    });

  });

  describe('when populated with 3 features', () => {

    const features = [];
    let vectorSource;
    beforeEach(() => {
      features.push(new Feature(new LineString([[0, 0], [10, 10]])));
      features.push(new Feature(new Point([0, 10])));
      features.push(new Feature(new Point([10, 5])));
      vectorSource = new VectorSource({
        features: features
      });
    });

    describe('#getClosestFeatureToCoordinate', () => {

      test('returns the expected feature', () => {
        const feature = vectorSource.getClosestFeatureToCoordinate([1, 9]);
        expect(feature).toBe(features[1]);
      });

      test('returns the expected feature when a filter is used', () => {
        const feature = vectorSource.getClosestFeatureToCoordinate([1, 9], function(feature) {
          return feature.getGeometry().getType() == 'LineString';
        });
        expect(feature).toBe(features[0]);
      });

    });

  });

  describe('clear and refresh', () => {

    let map, source, spy;
    beforeEach(done => {
      source = new VectorSource({
        format: new GeoJSON(),
        url: 'spec/ol/source/vectorsource/single-feature.json'
      });
      const target = document.createElement('div');
      target.style.width = target.style.height = '100px';
      document.body.appendChild(target);
      map = new Map({
        target: target,
        layers: [
          new VectorLayer({
            source: source
          })
        ],
        view: new View({
          center: [0, 0],
          zoom: 0
        })
      });
      map.once('rendercomplete', function() {
        spy = sinon.spy(source, 'loader_');
        done();
      });
    });

    afterEach(() => {
      if (spy) {
        source.loader_.restore();
      }
      document.body.removeChild(map.getTargetElement());
      map.setTarget(null);
    });

    test('#refresh() reloads from server', done => {
      expect(source.getFeatures()).toHaveLength(1);
      map.once('rendercomplete', function() {
        expect(source.getFeatures()).toHaveLength(1);
        expect(spy.callCount).toBe(1);
        done();
      });
      source.refresh();
    });

    test('#clear() removes all features from the source', done => {
      expect(source.getFeatures()).toHaveLength(1);
      map.once('rendercomplete', function() {
        expect(source.getFeatures()).toHaveLength(0);
        expect(spy.callCount).toBe(0);
        done();
      });
      source.clear();
    });

    test('After #setUrl(), refresh() loads from the new url', done => {
      source.loader_.restore();
      spy = undefined;
      expect(source.getFeatures()).toHaveLength(1);
      const oldCoordinates = source.getFeatures()[0].getGeometry().getCoordinates();
      map.on('rendercomplete', function() {
        expect(source.getFeatures()).toHaveLength(1);
        const newCoordinates = source.getFeatures()[0].getGeometry().getCoordinates();
        expect(newCoordinates).not.toEqual(oldCoordinates);
        done();
      });
      source.setUrl('spec/ol/data/point.json');
      source.refresh();
    });
  });

  describe('when populated with 10 random points and a null', () => {

    let features;
    let vectorSource;
    beforeEach(() => {
      features = [];
      let i;
      for (i = 0; i < 10; ++i) {
        features[i] =
            new Feature(new Point([Math.random(), Math.random()]));
      }
      features.push(new Feature(null));
      vectorSource = new VectorSource({
        features: features
      });
    });

    describe('#clear', () => {

      test('removes all features using fast path', () => {
        const removeFeatureSpy = sinon.spy();
        listen(vectorSource, 'removefeature', removeFeatureSpy);
        const clearSourceSpy = sinon.spy();
        listen(vectorSource, 'clear', clearSourceSpy);
        vectorSource.clear(true);
        expect(vectorSource.getFeatures()).toEqual([]);
        expect(vectorSource.isEmpty()).toBe(true);
        expect(removeFeatureSpy).not.to.be.called();
        expect(removeFeatureSpy.callCount).toBe(0);
        expect(clearSourceSpy).to.be.called();
        expect(clearSourceSpy.callCount).toBe(1);
      });

      test('removes all features using slow path', () => {
        const removeFeatureSpy = sinon.spy();
        listen(vectorSource, 'removefeature', removeFeatureSpy);
        const clearSourceSpy = sinon.spy();
        listen(vectorSource, 'clear', clearSourceSpy);
        vectorSource.clear();
        expect(vectorSource.getFeatures()).toEqual([]);
        expect(vectorSource.isEmpty()).toBe(true);
        expect(removeFeatureSpy).to.be.called();
        expect(removeFeatureSpy.callCount).toBe(features.length);
        expect(clearSourceSpy).to.be.called();
        expect(clearSourceSpy.callCount).toBe(1);
      });

    });

    describe('#forEachFeatureInExtent', () => {

      test('is called the expected number of times', () => {
        const f = sinon.spy();
        vectorSource.forEachFeatureInExtent(infiniteExtent, f);
        expect(f.callCount).toBe(10);
      });

      test('allows breaking out', () => {
        let count = 0;
        const result = vectorSource.forEachFeatureInExtent(infiniteExtent,
          function(f) {
            return ++count == 5;
          });
        expect(result).toBe(true);
        expect(count).toBe(5);
      });

    });

    describe('#getFeaturesInExtent', () => {

      test('returns the expected number of features', () => {
        expect(vectorSource.getFeaturesInExtent(infiniteExtent)).toHaveLength(10);
      });

    });

    describe('#isEmpty', () => {

      test('returns false', () => {
        expect(vectorSource.isEmpty()).toBe(false);
      });

    });

    describe('#removeFeature', () => {

      test('works as expected', () => {
        let i;
        for (i = features.length - 1; i >= 0; --i) {
          vectorSource.removeFeature(features[i]);
          expect(vectorSource.getFeaturesInExtent(infiniteExtent)).toHaveLength(i);
        }
      });

      test('fires a change event', () => {
        const listener = sinon.spy();
        listen(vectorSource, 'change', listener);
        vectorSource.removeFeature(features[0]);
        expect(listener).to.be.called();
      });

      test('fires a removefeature event', () => {
        const listener = sinon.spy();
        listen(vectorSource, 'removefeature', listener);
        vectorSource.removeFeature(features[0]);
        expect(listener).to.be.called();
      });

    });

    describe('modifying a feature\'s geometry', () => {

      test('keeps the R-Tree index up to date', () => {
        expect(vectorSource.getFeaturesInExtent([0, 0, 1, 1])).toHaveLength(10);
        features[0].getGeometry().setCoordinates([100, 100]);
        expect(vectorSource.getFeaturesInExtent([0, 0, 1, 1])).toHaveLength(9);
        features[0].getGeometry().setCoordinates([0.5, 0.5]);
        expect(vectorSource.getFeaturesInExtent([0, 0, 1, 1])).toHaveLength(10);
      });

    });

    describe('setting a features geometry', () => {

      test('keeps the R-Tree index up to date', () => {
        expect(vectorSource.getFeaturesInExtent([0, 0, 1, 1])).toHaveLength(10);
        features[0].setGeometry(new Point([100, 100]));
        expect(vectorSource.getFeaturesInExtent([0, 0, 1, 1])).toHaveLength(9);
      });

    });

  });

  describe('tracking changes to features', () => {

    let vectorSource;
    beforeEach(() => {
      vectorSource = new VectorSource();
    });

    test('keeps its index up-to-date', () => {
      const feature = new Feature(new Point([1, 1]));
      vectorSource.addFeature(feature);
      expect(vectorSource.getFeaturesInExtent([0, 0, 2, 2])).toEqual([feature]);
      feature.getGeometry().setCoordinates([3, 3]);
      expect(vectorSource.getFeaturesInExtent([0, 0, 2, 2])).toHaveLength(0);
      expect(vectorSource.getFeaturesInExtent([2, 2, 4, 4])).toEqual([feature]);
    });

    test('handles features with null geometries', () => {
      const feature = new Feature(null);
      vectorSource.addFeature(feature);
      expect(vectorSource.getFeatures()).toEqual([feature]);
    });

    test('handles features with geometries changing from null', () => {
      const feature = new Feature(null);
      vectorSource.addFeature(feature);
      expect(vectorSource.getFeatures()).toEqual([feature]);
      feature.setGeometry(new Point([1, 1]));
      expect(vectorSource.getFeaturesInExtent([0, 0, 2, 2])).toEqual([feature]);
      expect(vectorSource.getFeatures()).toEqual([feature]);
    });

    test('handles features with geometries changing to null', () => {
      const feature = new Feature(new Point([1, 1]));
      vectorSource.addFeature(feature);
      expect(vectorSource.getFeatures()).toEqual([feature]);
      expect(vectorSource.getFeaturesInExtent([0, 0, 2, 2])).toEqual([feature]);
      feature.setGeometry(null);
      expect(vectorSource.getFeaturesInExtent([0, 0, 2, 2])).toHaveLength(0);
      expect(vectorSource.getFeatures()).toEqual([feature]);
    });

    test('fires a change event when setting a feature\'s property', () => {
      const feature = new Feature(new Point([1, 1]));
      vectorSource.addFeature(feature);
      const listener = sinon.spy();
      listen(vectorSource, 'change', listener);
      feature.set('foo', 'bar');
      expect(listener).to.be.called();
    });

    test('fires a changefeature event when updating a feature', () => {
      const feature = new Feature(new Point([1, 1]));
      vectorSource.addFeature(feature);
      const listener = sinon.spy(function(event) {
        expect(event.feature).toBe(feature);
      });
      vectorSource.on('changefeature', listener);
      feature.setStyle(null);
      expect(listener).to.be.called();
    });

  });

  describe('#getFeatureById()', () => {
    let source;
    beforeEach(() => {
      source = new VectorSource();
    });

    test('returns a feature by id', () => {
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      expect(source.getFeatureById('foo')).toBe(feature);
    });

    test('returns a feature by id (set after add)', () => {
      const feature = new Feature();
      source.addFeature(feature);
      expect(source.getFeatureById('foo')).toBe(null);
      feature.setId('foo');
      expect(source.getFeatureById('foo')).toBe(feature);
    });

    test('returns null when no feature is found', () => {
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      expect(source.getFeatureById('bar')).toBe(null);
    });

    test('returns null after removing feature', () => {
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      expect(source.getFeatureById('foo')).toBe(feature);
      source.removeFeature(feature);
      expect(source.getFeatureById('foo')).toBe(null);
    });

    test('returns null after unsetting id', () => {
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      expect(source.getFeatureById('foo')).toBe(feature);
      feature.setId(undefined);
      expect(source.getFeatureById('foo')).toBe(null);
    });

    test('returns null after clear', () => {
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      expect(source.getFeatureById('foo')).toBe(feature);
      source.clear();
      expect(source.getFeatureById('foo')).toBe(null);
    });

    test('returns null when no features are indexed', () => {
      expect(source.getFeatureById('foo')).toBe(null);
      source.addFeature(new Feature());
      expect(source.getFeatureById('foo')).toBe(null);
    });

    test('returns correct feature after add/remove/add', () => {
      expect(source.getFeatureById('foo')).toBe(null);
      const first = new Feature();
      first.setId('foo');
      source.addFeature(first);
      expect(source.getFeatureById('foo')).toBe(first);
      source.removeFeature(first);
      expect(source.getFeatureById('foo')).toBe(null);
      const second = new Feature();
      second.setId('foo');
      source.addFeature(second);
      expect(source.getFeatureById('foo')).toBe(second);
    });

    test('returns correct feature after add/change', () => {
      expect(source.getFeatureById('foo')).toBe(null);
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      expect(source.getFeatureById('foo')).toBe(feature);
      feature.setId('bar');
      expect(source.getFeatureById('foo')).toBe(null);
      expect(source.getFeatureById('bar')).toBe(feature);
    });

  });

  describe('#getFeatureByUid()', () => {
    let source;
    beforeEach(() => {
      source = new VectorSource();
    });

    test('returns a feature with an id', () => {
      const feature = new Feature();
      feature.setId('abcd');
      source.addFeature(feature);
      expect(source.getFeatureByUid(getUid(feature))).toBe(feature);
    });

    test('returns a feature without id', () => {
      const feature = new Feature();
      source.addFeature(feature);
      expect(source.getFeatureByUid(getUid(feature))).toBe(feature);
    });

    test('returns null when no feature is found', () => {
      const feature = new Feature();
      feature.setId('abcd');
      source.addFeature(feature);
      const wrongId = 'abcd';
      expect(source.getFeatureByUid(wrongId)).toBe(null);
    });

    test('returns null after removing feature', () => {
      const feature = new Feature();
      feature.setId('abcd');
      source.addFeature(feature);
      const uid = getUid(feature);
      expect(source.getFeatureByUid(uid)).toBe(feature);
      source.removeFeature(feature);
      expect(source.getFeatureByUid(uid)).toBe(null);
    });

    test('returns null after clear', () => {
      const feature = new Feature();
      feature.setId('abcd');
      source.addFeature(feature);
      const uid = getUid(feature);
      expect(source.getFeatureByUid(uid)).toBe(feature);
      source.clear();
      expect(source.getFeatureByUid(uid)).toBe(null);
    });

    test('returns null when no features are present', () => {
      expect(source.getFeatureByUid('abcd')).toBe(null);
    });

  });

  describe('#loadFeatures', () => {

    describe('with the "bbox" strategy', () => {


      test('requests the view extent plus render buffer', done => {
        const center = [-97.6114, 38.8403];
        const source = new VectorSource({
          strategy: bboxStrategy,
          loader: function(extent) {
            setTimeout(function() {
              const lonLatExtent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
              expect(lonLatExtent[0]).to.roughlyEqual(-99.259349218, 1e-9);
              expect(lonLatExtent[2]).to.roughlyEqual(-95.963450781, 1e-9);
              done();
            }, 0);
          }
        });
        const div = document.createElement('div');
        div.style.width = div.style.height = '100px';
        document.body.appendChild(div);
        const map = new Map({
          target: div,
          layers: [
            new VectorLayer({
              source: source
            })
          ],
          view: new View({
            center: fromLonLat(center),
            zoom: 7
          })
        });
        map.renderSync();
        map.setTarget(null);
        document.body.removeChild(div);
      });

    });

    describe('with no loader and the "all" strategy', () => {

      test('stores the infinity extent in the Rtree', () => {
        const source = new VectorSource();
        source.loadFeatures([-10000, -10000, 10000, 10000], 1,
          getProjection('EPSG:3857'));
        const loadedExtents = source.loadedExtentsRtree_.getAll();
        expect(loadedExtents).toHaveLength(1);
        expect(loadedExtents[0].extent).toEqual([-Infinity, -Infinity, Infinity, Infinity]);
      });
    });

    describe('with setLoader', () => {

      test('it will change the loader function', () => {
        let count1 = 0;
        const loader1 = function(bbox, resolution, projection) {
          count1++;
        };
        let count2 = 0;
        const loader2 = function(bbox, resolution, projection) {
          count2++;
        };
        const source = new VectorSource({loader: loader1});
        source.loadFeatures([-10000, -10000, 10000, 10000], 1,
          getProjection('EPSG:3857'));
        source.setLoader(loader2);
        source.refresh();
        source.loadFeatures([-10000, -10000, 10000, 10000], 1,
          getProjection('EPSG:3857'));
        expect(count1).toEqual(1);
        expect(count2).toEqual(1);
      });

      test('removes extents with #removeLoadedExtent()', done => {
        const source = new VectorSource();
        source.setLoader(function(bbox, resolution, projection) {
          setTimeout(function() {
            expect(source.loadedExtentsRtree_.getAll()).toHaveLength(1);
            source.removeLoadedExtent(bbox);
            expect(source.loadedExtentsRtree_.getAll()).toHaveLength(0);
            done();
          }, 0);
        });
        source.loadFeatures([-10000, -10000, 10000, 10000], 1, getProjection('EPSG:3857'));
      });
    });

  });

  describe('the feature id index', () => {
    let source;
    beforeEach(() => {
      source = new VectorSource();
    });

    test('ignores features with the same id', () => {
      const feature = new Feature();
      feature.setId('foo');
      source.addFeature(feature);
      const dupe = new Feature();
      dupe.setId('foo');
      source.addFeature(dupe);
      expect(source.getFeatures()).toHaveLength(1);
      expect(source.getFeatureById('foo')).toBe(feature);
    });

    test('allows changing feature and set the same id', () => {
      const foo = new Feature();
      foo.setId('foo');
      source.addFeature(foo);
      const bar = new Feature();
      bar.setId('bar');
      source.addFeature(bar);
      bar.setId('foo');
      expect(source.getFeatureById('foo')).toBe(bar);
    });

  });

  describe('the undefined feature id index', () => {
    let source;
    beforeEach(() => {
      source = new VectorSource();
    });

    test('disallows adding the same feature twice', () => {
      const feature = new Feature();
      source.addFeature(feature);
      expect(function() {
        source.addFeature(feature);
      }).toThrow();
    });
  });

  describe('with useSpatialIndex set to false', () => {
    let source;
    beforeEach(() => {
      source = new VectorSource({useSpatialIndex: false});
    });

    test('returns a features collection', () => {
      expect(source.getFeaturesCollection()).toBeInstanceOf(Collection);
    });

    test('#forEachFeatureInExtent loops through all features', () => {
      source.addFeatures([new Feature(), new Feature()]);
      const spy = sinon.spy();
      source.forEachFeatureInExtent([0, 0, 0, 0], spy);
      expect(spy.callCount).toBe(2);
    });

  });

  describe('with a collection of features', () => {
    let collection, source;
    beforeEach(() => {
      source = new VectorSource({
        useSpatialIndex: false
      });
      collection = source.getFeaturesCollection();
    });

    test('creates a features collection', () => {
      expect(source.getFeaturesCollection()).not.toBe(null);
    });

    test('adding/removing features keeps the collection in sync', () => {
      const feature = new Feature();
      source.addFeature(feature);
      expect(collection.getLength()).toBe(1);
      source.removeFeature(feature);
      expect(collection.getLength()).toBe(0);
    });

    test('#clear() features keeps the collection in sync', () => {
      const feature = new Feature();
      source.addFeatures([feature]);
      expect(collection.getLength()).toBe(1);
      source.clear();
      expect(collection.getLength()).toBe(0);
      source.addFeatures([feature]);
      expect(collection.getLength()).toBe(1);
      source.clear(true);
      expect(collection.getLength()).toBe(0);
    });

    test('keeps the source\'s features in sync with the collection', () => {
      const feature = new Feature();
      collection.push(feature);
      expect(source.getFeatures().length).toBe(1);
      collection.remove(feature);
      expect(source.getFeatures().length).toBe(0);
      collection.extend([feature]);
      expect(source.getFeatures().length).toBe(1);
      collection.clear();
      expect(source.getFeatures().length).toBe(0);
    });

    test(
      'prevents adding two features with a duplicate id in the collection',
      () => {
        source = new VectorSource({
          features: new Collection()
        });
        const feature1 = new Feature();
        feature1.setId('1');
        const feature2 = new Feature();
        feature2.setId('1');
        const collection = source.getFeaturesCollection();
        collection.push(feature1);
        collection.push(feature2);
        expect(collection.getLength()).toBe(1);
      }
    );
  });

  describe('with a collection of features plus spatial index', () => {
    let collection, source;
    beforeEach(() => {
      collection = new Collection();
      source = new VectorSource({
        features: collection
      });
    });

    test('#getFeaturesCollection returns the configured collection', () => {
      expect(source.getFeaturesCollection()).toBe(collection);
    });

    test('adding/removing features keeps the collection in sync', () => {
      const feature = new Feature();
      source.addFeature(feature);
      expect(collection.getLength()).toBe(1);
      source.removeFeature(feature);
      expect(collection.getLength()).toBe(0);
    });

    test('#clear() features keeps the collection in sync', () => {
      const feature = new Feature();
      source.addFeatures([feature]);
      expect(collection.getLength()).toBe(1);
      source.clear();
      expect(collection.getLength()).toBe(0);
      source.addFeatures([feature]);
      expect(collection.getLength()).toBe(1);
      source.clear(true);
      expect(collection.getLength()).toBe(0);
    });

    test('keeps the source\'s features in sync with the collection', () => {
      const feature = new Feature();
      collection.push(feature);
      expect(source.getFeatures().length).toBe(1);
      collection.remove(feature);
      expect(source.getFeatures().length).toBe(0);
      collection.extend([feature]);
      expect(source.getFeatures().length).toBe(1);
      collection.clear();
      expect(source.getFeatures().length).toBe(0);
    });

  });

});
