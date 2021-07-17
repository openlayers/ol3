/**
 * @module ol/source/Vector
 */

import Collection from '../Collection.js';
import CollectionEventType from '../CollectionEventType.js';
import Event from '../events/Event.js';
import EventType from '../events/EventType.js';
import ObjectEventType from '../ObjectEventType.js';
import RBush from '../structs/RBush.js';
import Source from './Source.js';
import SourceState from './State.js';
import VectorEventType from './VectorEventType.js';
import {TRUE, VOID} from '../functions.js';
import {all as allStrategy} from '../loadingstrategy.js';
import {assert} from '../asserts.js';
import {containsExtent, equals} from '../extent.js';
import {extend} from '../array.js';
import {getUid} from '../util.js';
import {getValues, isEmpty} from '../obj.js';
import {listen, unlistenByKey} from '../events.js';
import {xhr} from '../featureloader.js';

/**
 * A function that takes an {@link module:ol/extent~Extent} and a resolution as arguments, and
 * returns an array of {@link module:ol/extent~Extent} with the extents to load. Usually this
 * is one of the standard {@link module:ol/loadingstrategy} strategies.
 *
 * @typedef {function(import("../extent.js").Extent, number): Array<import("../extent.js").Extent>} LoadingStrategy
 * @api
 */

/**
 * @classdesc
 * Events emitted by {@link module:ol/source/Vector} instances are instances of this
 * type.
 * @template {import("../geom/Geometry.js").default} Geometry
 */
export class VectorSourceEvent extends Event {
  /**
   * @param {string} type Type.
   * @param {import("../Feature.js").default<Geometry>} [opt_feature] Feature.
   * @param {Array<import("../Feature.js").default<Geometry>>} [opt_features] Features.
   */
  constructor(type, opt_feature, opt_features) {
    super(type);

    /**
     * The added or removed feature for the `ADDFEATURE` and `REMOVEFEATURE` events, `undefined` otherwise.
     * @type {import("../Feature.js").default<Geometry>|undefined}
     * @api
     */
    this.feature = opt_feature;

    /**
     * The loaded features for the `FEATURESLOADED` event, `undefined` otherwise.
     * @type {Array<import("../Feature.js").default<Geometry>>|undefined}
     * @api
     */
    this.features = opt_features;
  }
}

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event.js").default, Return> &
 *   import("../Observable").OnSignature<import("../ObjectEventType").Types, import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<import("./VectorEventType").VectorSourceEventTypes, VectorSourceEvent, Return> &
 *   import("../Observable").CombinedOnSignature<import("../Observable").EventTypes|import("../ObjectEventType").Types|
 *     import("./VectorEventType").VectorSourceEventTypes, Return>} VectorSourceOnSignature
 */

/**
 * @typedef {Object} Options
 * @property {import("./Source.js").AttributionLike} [attributions] Attributions.
 * @property {Array<import("../Feature.js").default>|Collection<import("../Feature.js").default>} [features]
 * Features. If provided as {@link module:ol/Collection}, the features in the source
 * and the collection will stay in sync.
 * @property {import("../format/Feature.js").default} [format] The feature format used by the XHR
 * feature loader when `url` is set. Required if `url` is set, otherwise ignored.
 * @property {import("../featureloader.js").FeatureLoader} [loader]
 * The loader function used to load features, from a remote source for example.
 * If this is not set and `url` is set, the source will create and use an XHR
 * feature loader. The `'featuresloadend'` and `'featuresloaderror'` events
 * will only fire if the `success` and `failure` callbacks are used.
 *
 * Example:
 *
 * ```js
 * import {Vector} from 'ol/source';
 * import {GeoJSON} from 'ol/format';
 * import {bbox} from 'ol/loadingstrategy';
 *
 * var vectorSource = new Vector({
 *   format: new GeoJSON(),
 *   loader: function(extent, resolution, projection, success, failure) {
 *      var proj = projection.getCode();
 *      var url = 'https://ahocevar.com/geoserver/wfs?service=WFS&' +
 *          'version=1.1.0&request=GetFeature&typename=osm:water_areas&' +
 *          'outputFormat=application/json&srsname=' + proj + '&' +
 *          'bbox=' + extent.join(',') + ',' + proj;
 *      var xhr = new XMLHttpRequest();
 *      xhr.open('GET', url);
 *      var onError = function() {
 *        vectorSource.removeLoadedExtent(extent);
 *        failure();
 *      }
 *      xhr.onerror = onError;
 *      xhr.onload = function() {
 *        if (xhr.status == 200) {
 *          var features = vectorSource.getFormat().readFeatures(xhr.responseText);
 *          vectorSource.addFeatures(features);
 *          success(features);
 *        } else {
 *          onError();
 *        }
 *      }
 *      xhr.send();
 *    },
 *    strategy: bbox
 *  });
 * ```
 * @property {boolean} [overlaps=true] This source may have overlapping geometries.
 * Setting this to `false` (e.g. for sources with polygons that represent administrative
 * boundaries or TopoJSON sources) allows the renderer to optimise fill and
 * stroke operations.
 * @property {LoadingStrategy} [strategy] The loading strategy to use.
 * By default an {@link module:ol/loadingstrategy.all}
 * strategy is used, a one-off strategy which loads all features at once.
 * @property {string|import("../featureloader.js").FeatureUrlFunction} [url]
 * Setting this option instructs the source to load features using an XHR loader
 * (see {@link module:ol/featureloader.xhr}). Use a `string` and an
 * {@link module:ol/loadingstrategy.all} for a one-off download of all features from
 * the given URL. Use a {@link module:ol/featureloader~FeatureUrlFunction} to generate the url with
 * other loading strategies.
 * Requires `format` to be set as well.
 * When default XHR feature loader is provided, the features will
 * be transformed from the data projection to the view projection
 * during parsing. If your remote data source does not advertise its projection
 * properly, this transformation will be incorrect. For some formats, the
 * default projection (usually EPSG:4326) can be overridden by setting the
 * dataProjection constructor option on the format.
 * Note that if a source contains non-feature data, such as a GeoJSON geometry
 * or a KML NetworkLink, these will be ignored. Use a custom loader to load these.
 * @property {boolean} [useSpatialIndex=true]
 * By default, an RTree is used as spatial index. When features are removed and
 * added frequently, and the total number of features is low, setting this to
 * `false` may improve performance.
 *
 * Note that
 * {@link module:ol/source/Vector~VectorSource#getFeaturesInExtent},
 * {@link module:ol/source/Vector~VectorSource#getClosestFeatureToCoordinate} and
 * {@link module:ol/source/Vector~VectorSource#getExtent} cannot be used when `useSpatialIndex` is
 * set to `false`, and {@link module:ol/source/Vector~VectorSource#forEachFeatureInExtent} will loop
 * through all features.
 *
 * When set to `false`, the features will be maintained in an
 * {@link module:ol/Collection}, which can be retrieved through
 * {@link module:ol/source/Vector~VectorSource#getFeaturesCollection}.
 * @property {boolean} [wrapX=true] Wrap the world horizontally. For vector editing across the
 * -180° and 180° meridians to work properly, this should be set to `false`. The
 * resulting geometry coordinates will then exceed the world bounds.
 */

/**
 * @classdesc
 * Provides a source of features for vector layers. Vector features provided
 * by this source are suitable for editing. See {@link module:ol/source/VectorTile~VectorTile} for
 * vector data that is optimized for rendering.
 *
 * @fires VectorSourceEvent
 * @api
 * @template {import("../geom/Geometry.js").default} Geometry
 */
class VectorSource extends Source {
  /**
   * @param {Options} [opt_options] Vector source options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    super({
      attributions: options.attributions,
      projection: undefined,
      state: SourceState.READY,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
    });

    /***
     * @type {VectorSourceOnSignature<import("../Observable.js").OnReturn>}
     */
    this.on;

    /***
     * @type {VectorSourceOnSignature<import("../Observable.js").OnReturn>}
     */
    this.once;

    /***
     * @type {VectorSourceOnSignature<void>}
     */
    this.un;

    /**
     * @private
     * @type {import("../featureloader.js").FeatureLoader}
     */
    this.loader_ = VOID;

    /**
     * @private
     * @type {import("../format/Feature.js").default|undefined}
     */
    this.format_ = options.format;

    /**
     * @private
     * @type {boolean}
     */
    this.overlaps_ = options.overlaps === undefined ? true : options.overlaps;

    /**
     * @private
     * @type {string|import("../featureloader.js").FeatureUrlFunction|undefined}
     */
    this.url_ = options.url;

    if (options.loader !== undefined) {
      this.loader_ = options.loader;
    } else if (this.url_ !== undefined) {
      assert(this.format_, 7); // `format` must be set when `url` is set
      // create a XHR feature loader for "url" and "format"
      this.loader_ = xhr(
        this.url_,
        /** @type {import("../format/Feature.js").default} */ (this.format_)
      );
    }

    /**
     * @private
     * @type {LoadingStrategy}
     */
    this.strategy_ =
      options.strategy !== undefined ? options.strategy : allStrategy;

    const useSpatialIndex =
      options.useSpatialIndex !== undefined ? options.useSpatialIndex : true;

    /**
     * @private
     * @type {RBush<import("../Feature.js").default<Geometry>>}
     */
    this.featuresRtree_ = useSpatialIndex ? new RBush() : null;

    /**
     * @private
     * @type {RBush<{extent: import("../extent.js").Extent}>}
     */
    this.loadedExtentsRtree_ = new RBush();

    /**
     * @type {number}
     * @private
     */
    this.loadingExtentsCount_ = 0;

    /**
     * @private
     * @type {!Object<string, import("../Feature.js").default<Geometry>>}
     */
    this.nullGeometryFeatures_ = {};

    /**
     * A lookup of features by id (the return from feature.getId()).
     * @private
     * @type {!Object<string, import("../Feature.js").default<Geometry>>}
     */
    this.idIndex_ = {};

    /**
     * A lookup of features by uid (using getUid(feature)).
     * @private
     * @type {!Object<string, import("../Feature.js").default<Geometry>>}
     */
    this.uidIndex_ = {};

    /**
     * @private
     * @type {Object<string, Array<import("../events.js").EventsKey>>}
     */
    this.featureChangeKeys_ = {};

    /**
     * @private
     * @type {Collection<import("../Feature.js").default<Geometry>>}
     */
    this.featuresCollection_ = null;

    let collection, features;
    if (Array.isArray(options.features)) {
      features = options.features;
    } else if (options.features) {
      collection = options.features;
      features = collection.getArray();
    }
    if (!useSpatialIndex && collection === undefined) {
      collection = new Collection(features);
    }
    if (features !== undefined) {
      this.addFeaturesInternal(features);
    }
    if (collection !== undefined) {
      this.bindFeaturesCollection_(collection);
    }
  }

  /**
   * Add a single feature to the source.  If you want to add a batch of features
   * at once, call {@link module:ol/source/Vector~VectorSource#addFeatures #addFeatures()}
   * instead. A feature will not be added to the source if feature with
   * the same id is already there. The reason for this behavior is to avoid
   * feature duplication when using bbox or tile loading strategies.
   * Note: this also applies if an {@link module:ol/Collection} is used for features,
   * meaning that if a feature with a duplicate id is added in the collection, it will
   * be removed from it right away.
   * @param {import("../Feature.js").default<Geometry>} feature Feature to add.
   * @api
   */
  addFeature(feature) {
    this.addFeatureInternal(feature);
    this.changed();
  }

  /**
   * Add a feature without firing a `change` event.
   * @param {import("../Feature.js").default<Geometry>} feature Feature.
   * @protected
   */
  addFeatureInternal(feature) {
    const featureKey = getUid(feature);

    if (!this.addToIndex_(featureKey, feature)) {
      if (this.featuresCollection_) {
        this.featuresCollection_.remove(feature);
      }
      return;
    }

    this.setupChangeEvents_(featureKey, feature);

    const geometry = feature.getGeometry();
    if (geometry) {
      const extent = geometry.getExtent();
      if (this.featuresRtree_) {
        this.featuresRtree_.insert(extent, feature);
      }
    } else {
      this.nullGeometryFeatures_[featureKey] = feature;
    }

    this.dispatchEvent(
      new VectorSourceEvent(VectorEventType.ADDFEATURE, feature)
    );
  }

  /**
   * @param {string} featureKey Unique identifier for the feature.
   * @param {import("../Feature.js").default<Geometry>} feature The feature.
   * @private
   */
  setupChangeEvents_(featureKey, feature) {
    this.featureChangeKeys_[featureKey] = [
      listen(feature, EventType.CHANGE, this.handleFeatureChange_, this),
      listen(
        feature,
        ObjectEventType.PROPERTYCHANGE,
        this.handleFeatureChange_,
        this
      ),
    ];
  }

  /**
   * @param {string} featureKey Unique identifier for the feature.
   * @param {import("../Feature.js").default<Geometry>} feature The feature.
   * @return {boolean} The feature is "valid", in the sense that it is also a
   *     candidate for insertion into the Rtree.
   * @private
   */
  addToIndex_(featureKey, feature) {
    let valid = true;
    const id = feature.getId();
    if (id !== undefined) {
      if (!(id.toString() in this.idIndex_)) {
        this.idIndex_[id.toString()] = feature;
      } else {
        valid = false;
      }
    }
    if (valid) {
      assert(!(featureKey in this.uidIndex_), 30); // The passed `feature` was already added to the source
      this.uidIndex_[featureKey] = feature;
    }
    return valid;
  }

  /**
   * Add a batch of features to the source.
   * @param {Array<import("../Feature.js").default<Geometry>>} features Features to add.
   * @api
   */
  addFeatures(features) {
    this.addFeaturesInternal(features);
    this.changed();
  }

  /**
   * Add features without firing a `change` event.
   * @param {Array<import("../Feature.js").default<Geometry>>} features Features.
   * @protected
   */
  addFeaturesInternal(features) {
    const extents = [];
    const newFeatures = [];
    const geometryFeatures = [];

    for (let i = 0, length = features.length; i < length; i++) {
      const feature = features[i];
      const featureKey = getUid(feature);
      if (this.addToIndex_(featureKey, feature)) {
        newFeatures.push(feature);
      }
    }

    for (let i = 0, length = newFeatures.length; i < length; i++) {
      const feature = newFeatures[i];
      const featureKey = getUid(feature);
      this.setupChangeEvents_(featureKey, feature);

      const geometry = feature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        extents.push(extent);
        geometryFeatures.push(feature);
      } else {
        this.nullGeometryFeatures_[featureKey] = feature;
      }
    }
    if (this.featuresRtree_) {
      this.featuresRtree_.load(extents, geometryFeatures);
    }

    for (let i = 0, length = newFeatures.length; i < length; i++) {
      this.dispatchEvent(
        new VectorSourceEvent(VectorEventType.ADDFEATURE, newFeatures[i])
      );
    }
  }

  /**
   * @param {!Collection<import("../Feature.js").default<Geometry>>} collection Collection.
   * @private
   */
  bindFeaturesCollection_(collection) {
    let modifyingCollection = false;
    this.addEventListener(
      VectorEventType.ADDFEATURE,
      /**
       * @param {VectorSourceEvent<Geometry>} evt The vector source event
       */
      function (evt) {
        if (!modifyingCollection) {
          modifyingCollection = true;
          collection.push(evt.feature);
          modifyingCollection = false;
        }
      }
    );
    this.addEventListener(
      VectorEventType.REMOVEFEATURE,
      /**
       * @param {VectorSourceEvent<Geometry>} evt The vector source event
       */
      function (evt) {
        if (!modifyingCollection) {
          modifyingCollection = true;
          collection.remove(evt.feature);
          modifyingCollection = false;
        }
      }
    );
    collection.addEventListener(
      CollectionEventType.ADD,
      /**
       * @param {import("../Collection.js").CollectionEvent} evt The collection event
       */
      function (evt) {
        if (!modifyingCollection) {
          modifyingCollection = true;
          this.addFeature(
            /** @type {import("../Feature.js").default<Geometry>} */ (
              evt.element
            )
          );
          modifyingCollection = false;
        }
      }.bind(this)
    );
    collection.addEventListener(
      CollectionEventType.REMOVE,
      /**
       * @param {import("../Collection.js").CollectionEvent} evt The collection event
       */
      function (evt) {
        if (!modifyingCollection) {
          modifyingCollection = true;
          this.removeFeature(
            /** @type {import("../Feature.js").default<Geometry>} */ (
              evt.element
            )
          );
          modifyingCollection = false;
        }
      }.bind(this)
    );
    this.featuresCollection_ = collection;
  }

  /**
   * Remove all features from the source.
   * @param {boolean} [opt_fast] Skip dispatching of {@link module:ol/source/Vector.VectorSourceEvent#event:removefeature removefeature} events.
   * @api
   */
  clear(opt_fast) {
    if (opt_fast) {
      for (const featureId in this.featureChangeKeys_) {
        const keys = this.featureChangeKeys_[featureId];
        keys.forEach(unlistenByKey);
      }
      if (!this.featuresCollection_) {
        this.featureChangeKeys_ = {};
        this.idIndex_ = {};
        this.uidIndex_ = {};
      }
    } else {
      if (this.featuresRtree_) {
        this.featuresRtree_.forEach(this.removeFeatureInternal.bind(this));
        for (const id in this.nullGeometryFeatures_) {
          this.removeFeatureInternal(this.nullGeometryFeatures_[id]);
        }
      }
    }
    if (this.featuresCollection_) {
      this.featuresCollection_.clear();
    }

    if (this.featuresRtree_) {
      this.featuresRtree_.clear();
    }
    this.nullGeometryFeatures_ = {};

    const clearEvent = new VectorSourceEvent(VectorEventType.CLEAR);
    this.dispatchEvent(clearEvent);
    this.changed();
  }

  /**
   * Iterate through all features on the source, calling the provided callback
   * with each one.  If the callback returns any "truthy" value, iteration will
   * stop and the function will return the same value.
   * Note: this function only iterate through the feature that have a defined geometry.
   *
   * @param {function(import("../Feature.js").default<Geometry>): T} callback Called with each feature
   *     on the source.  Return a truthy value to stop iteration.
   * @return {T|undefined} The return value from the last call to the callback.
   * @template T
   * @api
   */
  forEachFeature(callback) {
    if (this.featuresRtree_) {
      return this.featuresRtree_.forEach(callback);
    } else if (this.featuresCollection_) {
      this.featuresCollection_.forEach(callback);
    }
  }

  /**
   * Iterate through all features whose geometries contain the provided
   * coordinate, calling the callback with each feature.  If the callback returns
   * a "truthy" value, iteration will stop and the function will return the same
   * value.
   *
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @param {function(import("../Feature.js").default<Geometry>): T} callback Called with each feature
   *     whose goemetry contains the provided coordinate.
   * @return {T|undefined} The return value from the last call to the callback.
   * @template T
   */
  forEachFeatureAtCoordinateDirect(coordinate, callback) {
    const extent = [coordinate[0], coordinate[1], coordinate[0], coordinate[1]];
    return this.forEachFeatureInExtent(extent, function (feature) {
      const geometry = feature.getGeometry();
      if (geometry.intersectsCoordinate(coordinate)) {
        return callback(feature);
      } else {
        return undefined;
      }
    });
  }

  /**
   * Iterate through all features whose bounding box intersects the provided
   * extent (note that the feature's geometry may not intersect the extent),
   * calling the callback with each feature.  If the callback returns a "truthy"
   * value, iteration will stop and the function will return the same value.
   *
   * If you are interested in features whose geometry intersects an extent, call
   * the {@link module:ol/source/Vector~VectorSource#forEachFeatureIntersectingExtent #forEachFeatureIntersectingExtent()} method instead.
   *
   * When `useSpatialIndex` is set to false, this method will loop through all
   * features, equivalent to {@link module:ol/source/Vector~VectorSource#forEachFeature #forEachFeature()}.
   *
   * @param {import("../extent.js").Extent} extent Extent.
   * @param {function(import("../Feature.js").default<Geometry>): T} callback Called with each feature
   *     whose bounding box intersects the provided extent.
   * @return {T|undefined} The return value from the last call to the callback.
   * @template T
   * @api
   */
  forEachFeatureInExtent(extent, callback) {
    if (this.featuresRtree_) {
      return this.featuresRtree_.forEachInExtent(extent, callback);
    } else if (this.featuresCollection_) {
      this.featuresCollection_.forEach(callback);
    }
  }

  /**
   * Iterate through all features whose geometry intersects the provided extent,
   * calling the callback with each feature.  If the callback returns a "truthy"
   * value, iteration will stop and the function will return the same value.
   *
   * If you only want to test for bounding box intersection, call the
   * {@link module:ol/source/Vector~VectorSource#forEachFeatureInExtent #forEachFeatureInExtent()} method instead.
   *
   * @param {import("../extent.js").Extent} extent Extent.
   * @param {function(import("../Feature.js").default<Geometry>): T} callback Called with each feature
   *     whose geometry intersects the provided extent.
   * @return {T|undefined} The return value from the last call to the callback.
   * @template T
   * @api
   */
  forEachFeatureIntersectingExtent(extent, callback) {
    return this.forEachFeatureInExtent(
      extent,
      /**
       * @param {import("../Feature.js").default<Geometry>} feature Feature.
       * @return {T|undefined} The return value from the last call to the callback.
       */
      function (feature) {
        const geometry = feature.getGeometry();
        if (geometry.intersectsExtent(extent)) {
          const result = callback(feature);
          if (result) {
            return result;
          }
        }
      }
    );
  }

  /**
   * Get the features collection associated with this source. Will be `null`
   * unless the source was configured with `useSpatialIndex` set to `false`, or
   * with an {@link module:ol/Collection} as `features`.
   * @return {Collection<import("../Feature.js").default<Geometry>>} The collection of features.
   * @api
   */
  getFeaturesCollection() {
    return this.featuresCollection_;
  }

  /**
   * Get a snapshot of the features currently on the source in random order. The returned array
   * is a copy, the features are references to the features in the source.
   * @return {Array<import("../Feature.js").default<Geometry>>} Features.
   * @api
   */
  getFeatures() {
    let features;
    if (this.featuresCollection_) {
      features = this.featuresCollection_.getArray().slice(0);
    } else if (this.featuresRtree_) {
      features = this.featuresRtree_.getAll();
      if (!isEmpty(this.nullGeometryFeatures_)) {
        extend(features, getValues(this.nullGeometryFeatures_));
      }
    }
    return /** @type {Array<import("../Feature.js").default<Geometry>>} */ (
      features
    );
  }

  /**
   * Get all features whose geometry intersects the provided coordinate.
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @return {Array<import("../Feature.js").default<Geometry>>} Features.
   * @api
   */
  getFeaturesAtCoordinate(coordinate) {
    const features = [];
    this.forEachFeatureAtCoordinateDirect(coordinate, function (feature) {
      features.push(feature);
    });
    return features;
  }

  /**
   * Get all features whose bounding box intersects the provided extent.  Note that this returns an array of
   * all features intersecting the given extent in random order (so it may include
   * features whose geometries do not intersect the extent).
   *
   * When `useSpatialIndex` is set to false, this method will return all
   * features.
   *
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {Array<import("../Feature.js").default<Geometry>>} Features.
   * @api
   */
  getFeaturesInExtent(extent) {
    if (this.featuresRtree_) {
      return this.featuresRtree_.getInExtent(extent);
    } else if (this.featuresCollection_) {
      return this.featuresCollection_.getArray().slice(0);
    } else {
      return [];
    }
  }

  /**
   * Get the closest feature to the provided coordinate.
   *
   * This method is not available when the source is configured with
   * `useSpatialIndex` set to `false`.
   * @param {import("../coordinate.js").Coordinate} coordinate Coordinate.
   * @param {function(import("../Feature.js").default<Geometry>):boolean} [opt_filter] Feature filter function.
   *     The filter function will receive one argument, the {@link module:ol/Feature feature}
   *     and it should return a boolean value. By default, no filtering is made.
   * @return {import("../Feature.js").default<Geometry>} Closest feature.
   * @api
   */
  getClosestFeatureToCoordinate(coordinate, opt_filter) {
    // Find the closest feature using branch and bound.  We start searching an
    // infinite extent, and find the distance from the first feature found.  This
    // becomes the closest feature.  We then compute a smaller extent which any
    // closer feature must intersect.  We continue searching with this smaller
    // extent, trying to find a closer feature.  Every time we find a closer
    // feature, we update the extent being searched so that any even closer
    // feature must intersect it.  We continue until we run out of features.
    const x = coordinate[0];
    const y = coordinate[1];
    let closestFeature = null;
    const closestPoint = [NaN, NaN];
    let minSquaredDistance = Infinity;
    const extent = [-Infinity, -Infinity, Infinity, Infinity];
    const filter = opt_filter ? opt_filter : TRUE;
    this.featuresRtree_.forEachInExtent(
      extent,
      /**
       * @param {import("../Feature.js").default<Geometry>} feature Feature.
       */
      function (feature) {
        if (filter(feature)) {
          const geometry = feature.getGeometry();
          const previousMinSquaredDistance = minSquaredDistance;
          minSquaredDistance = geometry.closestPointXY(
            x,
            y,
            closestPoint,
            minSquaredDistance
          );
          if (minSquaredDistance < previousMinSquaredDistance) {
            closestFeature = feature;
            // This is sneaky.  Reduce the extent that it is currently being
            // searched while the R-Tree traversal using this same extent object
            // is still in progress.  This is safe because the new extent is
            // strictly contained by the old extent.
            const minDistance = Math.sqrt(minSquaredDistance);
            extent[0] = x - minDistance;
            extent[1] = y - minDistance;
            extent[2] = x + minDistance;
            extent[3] = y + minDistance;
          }
        }
      }
    );
    return closestFeature;
  }

  /**
   * Get the extent of the features currently in the source.
   *
   * This method is not available when the source is configured with
   * `useSpatialIndex` set to `false`.
   * @param {import("../extent.js").Extent} [opt_extent] Destination extent. If provided, no new extent
   *     will be created. Instead, that extent's coordinates will be overwritten.
   * @return {import("../extent.js").Extent} Extent.
   * @api
   */
  getExtent(opt_extent) {
    return this.featuresRtree_.getExtent(opt_extent);
  }

  /**
   * Get a feature by its identifier (the value returned by feature.getId()).
   * Note that the index treats string and numeric identifiers as the same.  So
   * `source.getFeatureById(2)` will return a feature with id `'2'` or `2`.
   *
   * @param {string|number} id Feature identifier.
   * @return {import("../Feature.js").default<Geometry>} The feature (or `null` if not found).
   * @api
   */
  getFeatureById(id) {
    const feature = this.idIndex_[id.toString()];
    return feature !== undefined ? feature : null;
  }

  /**
   * Get a feature by its internal unique identifier (using `getUid`).
   *
   * @param {string} uid Feature identifier.
   * @return {import("../Feature.js").default<Geometry>} The feature (or `null` if not found).
   */
  getFeatureByUid(uid) {
    const feature = this.uidIndex_[uid];
    return feature !== undefined ? feature : null;
  }

  /**
   * Get the format associated with this source.
   *
   * @return {import("../format/Feature.js").default|undefined} The feature format.
   * @api
   */
  getFormat() {
    return this.format_;
  }

  /**
   * @return {boolean} The source can have overlapping geometries.
   */
  getOverlaps() {
    return this.overlaps_;
  }

  /**
   * Get the url associated with this source.
   *
   * @return {string|import("../featureloader.js").FeatureUrlFunction|undefined} The url.
   * @api
   */
  getUrl() {
    return this.url_;
  }

  /**
   * @param {Event} event Event.
   * @private
   */
  handleFeatureChange_(event) {
    const feature = /** @type {import("../Feature.js").default<Geometry>} */ (
      event.target
    );
    const featureKey = getUid(feature);
    const geometry = feature.getGeometry();
    if (!geometry) {
      if (!(featureKey in this.nullGeometryFeatures_)) {
        if (this.featuresRtree_) {
          this.featuresRtree_.remove(feature);
        }
        this.nullGeometryFeatures_[featureKey] = feature;
      }
    } else {
      const extent = geometry.getExtent();
      if (featureKey in this.nullGeometryFeatures_) {
        delete this.nullGeometryFeatures_[featureKey];
        if (this.featuresRtree_) {
          this.featuresRtree_.insert(extent, feature);
        }
      } else {
        if (this.featuresRtree_) {
          this.featuresRtree_.update(extent, feature);
        }
      }
    }
    const id = feature.getId();
    if (id !== undefined) {
      const sid = id.toString();
      if (this.idIndex_[sid] !== feature) {
        this.removeFromIdIndex_(feature);
        this.idIndex_[sid] = feature;
      }
    } else {
      this.removeFromIdIndex_(feature);
      this.uidIndex_[featureKey] = feature;
    }
    this.changed();
    this.dispatchEvent(
      new VectorSourceEvent(VectorEventType.CHANGEFEATURE, feature)
    );
  }

  /**
   * Returns true if the feature is contained within the source.
   * @param {import("../Feature.js").default<Geometry>} feature Feature.
   * @return {boolean} Has feature.
   * @api
   */
  hasFeature(feature) {
    const id = feature.getId();
    if (id !== undefined) {
      return id in this.idIndex_;
    } else {
      return getUid(feature) in this.uidIndex_;
    }
  }

  /**
   * @return {boolean} Is empty.
   */
  isEmpty() {
    return this.featuresRtree_.isEmpty() && isEmpty(this.nullGeometryFeatures_);
  }

  /**
   * @param {import("../extent.js").Extent} extent Extent.
   * @param {number} resolution Resolution.
   * @param {import("../proj/Projection.js").default} projection Projection.
   */
  loadFeatures(extent, resolution, projection) {
    const loadedExtentsRtree = this.loadedExtentsRtree_;
    const extentsToLoad = this.strategy_(extent, resolution);
    for (let i = 0, ii = extentsToLoad.length; i < ii; ++i) {
      const extentToLoad = extentsToLoad[i];
      const alreadyLoaded = loadedExtentsRtree.forEachInExtent(
        extentToLoad,
        /**
         * @param {{extent: import("../extent.js").Extent}} object Object.
         * @return {boolean} Contains.
         */
        function (object) {
          return containsExtent(object.extent, extentToLoad);
        }
      );
      if (!alreadyLoaded) {
        ++this.loadingExtentsCount_;
        this.dispatchEvent(
          new VectorSourceEvent(VectorEventType.FEATURESLOADSTART)
        );
        this.loader_.call(
          this,
          extentToLoad,
          resolution,
          projection,
          function (features) {
            --this.loadingExtentsCount_;
            this.dispatchEvent(
              new VectorSourceEvent(
                VectorEventType.FEATURESLOADEND,
                undefined,
                features
              )
            );
          }.bind(this),
          function () {
            --this.loadingExtentsCount_;
            this.dispatchEvent(
              new VectorSourceEvent(VectorEventType.FEATURESLOADERROR)
            );
          }.bind(this)
        );
        loadedExtentsRtree.insert(extentToLoad, {extent: extentToLoad.slice()});
      }
    }
    this.loading =
      this.loader_.length < 4 ? false : this.loadingExtentsCount_ > 0;
  }

  refresh() {
    this.clear(true);
    this.loadedExtentsRtree_.clear();
    super.refresh();
  }

  /**
   * Remove an extent from the list of loaded extents.
   * @param {import("../extent.js").Extent} extent Extent.
   * @api
   */
  removeLoadedExtent(extent) {
    const loadedExtentsRtree = this.loadedExtentsRtree_;
    let obj;
    loadedExtentsRtree.forEachInExtent(extent, function (object) {
      if (equals(object.extent, extent)) {
        obj = object;
        return true;
      }
    });
    if (obj) {
      loadedExtentsRtree.remove(obj);
    }
  }

  /**
   * Remove a single feature from the source.  If you want to remove all features
   * at once, use the {@link module:ol/source/Vector~VectorSource#clear #clear()} method
   * instead.
   * @param {import("../Feature.js").default<Geometry>} feature Feature to remove.
   * @api
   */
  removeFeature(feature) {
    const featureKey = getUid(feature);
    if (featureKey in this.nullGeometryFeatures_) {
      delete this.nullGeometryFeatures_[featureKey];
    } else {
      if (this.featuresRtree_) {
        this.featuresRtree_.remove(feature);
      }
    }
    this.removeFeatureInternal(feature);
    this.changed();
  }

  /**
   * Remove feature without firing a `change` event.
   * @param {import("../Feature.js").default<Geometry>} feature Feature.
   * @protected
   */
  removeFeatureInternal(feature) {
    const featureKey = getUid(feature);
    this.featureChangeKeys_[featureKey].forEach(unlistenByKey);
    delete this.featureChangeKeys_[featureKey];
    const id = feature.getId();
    if (id !== undefined) {
      delete this.idIndex_[id.toString()];
    }
    delete this.uidIndex_[featureKey];
    this.dispatchEvent(
      new VectorSourceEvent(VectorEventType.REMOVEFEATURE, feature)
    );
  }

  /**
   * Remove a feature from the id index.  Called internally when the feature id
   * may have changed.
   * @param {import("../Feature.js").default<Geometry>} feature The feature.
   * @return {boolean} Removed the feature from the index.
   * @private
   */
  removeFromIdIndex_(feature) {
    let removed = false;
    for (const id in this.idIndex_) {
      if (this.idIndex_[id] === feature) {
        delete this.idIndex_[id];
        removed = true;
        break;
      }
    }
    return removed;
  }

  /**
   * Set the new loader of the source. The next render cycle will use the
   * new loader.
   * @param {import("../featureloader.js").FeatureLoader} loader The loader to set.
   * @api
   */
  setLoader(loader) {
    this.loader_ = loader;
  }

  /**
   * Points the source to a new url. The next render cycle will use the new url.
   * @param {string|import("../featureloader.js").FeatureUrlFunction} url Url.
   * @api
   */
  setUrl(url) {
    assert(this.format_, 7); // `format` must be set when `url` is set
    this.url_ = url;
    this.setLoader(xhr(url, this.format_));
  }
}

export default VectorSource;
