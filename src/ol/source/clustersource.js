goog.provide('ol.source.Cluster');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ol.ClusterFeature');
goog.require('ol.coordinate');
goog.require('ol.extent');
goog.require('ol.geom.Point');
goog.require('ol.source.Vector');



/**
 * @constructor
 * @param {olx.source.ClusterOptions} options
 * @extends {ol.source.Vector}
 * @api
 */
ol.source.Cluster = function(options) {
  goog.base(this, {
    attributions: options.attributions,
    extent: options.extent,
    logo: options.logo,
    projection: options.projection
  });

  /**
   * @type {?number}
   * @private
   */
  this.resolution_ = null;


  /**
   * @type {?ol.Extent}
   * @private
   */
  this.clusteredExtent_ = null;


  /**
   * @type {number}
   */
  this.distance = options.distance || 20;


  /**
   * @type {Array.<Array.<ol.Feature>>}
   */
  this.clusters = [];


  /**
   * @type {Array.<ol.ClusterFeature>}
   */
  this.features = [];

  /**
   * @type {number}
   */
  this.smallestCluster = options.smallestCluster || 2;


  /**
   * @type {ol.source.Vector}
   */
  this.source = options.source;

  this.source.on('change', ol.source.Cluster.prototype.onSourceChange_, this);
};
goog.inherits(ol.source.Cluster, ol.source.Vector);


/**
 * @param {ol.Extent} extent
 * @param {number} resolution
 */
ol.source.Cluster.prototype.loadFeatures = function(extent, resolution) {
  if (!this.clusteredExtent_ ||
      !ol.extent.equals(extent, this.clusteredExtent_) ||
      resolution !== this.getResolution()) {
    this.clear();
    this.clusteredExtent_ = extent;
    this.setResolution(resolution);
    this.cluster(extent, resolution);
    this.addFeatures(this.features);
  }
};


/**
 * handle the source changing
 * @private
 */
ol.source.Cluster.prototype.onSourceChange_ = function() {
  if (!goog.isNull(this.resolution_) && !goog.isNull(this.clusteredExtent_)) {
    this.clear();
    this.cluster(this.clusteredExtent_,
        /** @type {number} */(this.resolution_));
    this.addFeatures(this.features);
    this.dispatchChangeEvent();
  }
};


/**
 * @param {ol.Extent} extent
 * @param {number} resolution
 */
ol.source.Cluster.prototype.cluster = function(extent, resolution) {
  this.clearClusters_();
  var mapDistance = this.distance * resolution;
  var features = this.source.getFeaturesInExtent(extent);
  for (var i = 0, ii = features.length; i < ii; i++) {
    var feature = features[i];
    var geom = feature.getGeometry();
    goog.asserts.assert(geom instanceof ol.geom.Point);
    var coord = geom.getCoordinates();
    if (!ol.extent.containsCoordinate(extent, coord)) {
      continue;
    }
    for (var j = i + 1; j < ii; j++) {
      var feature2 = features[j];
      if (this.shouldCluster(feature, feature2, mapDistance)) {
        this.clusterFeatures(feature, feature2);
        break;
      }
      if (j == ii - 1 &&
          this.getClusterByFeature(feature) == -1) {
        var cluster = [feature];
        this.clusters.push(cluster);
      }
    }
  }
  this.createFeaturesFromClusters();
};


/**
 * @private
 */
ol.source.Cluster.prototype.clearClusters_ = function() {
  this.clusters = [];
};


/**
 * Decides whether feature and feature2 should be in the same cluster. A
 * feature should join a cluster if its distance from any of the cluster
 * members is less than the distance specified when calling this function.
 *
 * @param {ol.Feature} feature The feature to be clustered
 * @param {ol.Feature} feature2
 * @param {number} distance The minimum distance at which features should not
 *     be clustered
 * @return {boolean}
 */
ol.source.Cluster.prototype.shouldCluster = function(feature, feature2,
    distance) {
  var shouldCluster = false;
  var clusterIndex = this.getClusterByFeature(feature2);
  var featureDist;
  if (clusterIndex !== -1) {
    var cluster = this.clusters[clusterIndex];
    for (var k = 0, kk = cluster.length; k < kk; k++) {
      feature2 = cluster[k];
      featureDist = this.getDistanceBetweenFeatures(feature, feature2);
      if (featureDist < distance) {
        shouldCluster = true;
        break;
      }
    }
  } else {
    featureDist = this.getDistanceBetweenFeatures(feature, feature2);
    if (featureDist < distance) {
      shouldCluster = true;
    }
  }
  return shouldCluster;
};


/**
 * @param {ol.Feature} feature
 * @return {number}
 */
ol.source.Cluster.prototype.getClusterByFeature = function(feature) {
  var cluster = -1;
  for (var i = 0, ii = this.clusters.length; i < ii; i++) {
    if (goog.array.contains(this.clusters[i], feature)) {
      cluster = i;
      break;
    }
  }
  return cluster;
};


/**
 * @param {ol.Feature} feature1
 * @param {ol.Feature} feature2
 * @return {number}
 */
ol.source.Cluster.prototype.getDistanceBetweenFeatures = function(feature1,
    feature2) {
  var geom1 = feature1.getGeometry();
  var geom2 = feature2.getGeometry();
  goog.asserts.assertInstanceof(geom1, ol.geom.Point);
  goog.asserts.assertInstanceof(geom2, ol.geom.Point);
  var coords1 = geom1.getFlatCoordinates();
  var coords2 = geom2.getFlatCoordinates();
  var squaredDist = ol.coordinate.squaredDistance(coords1, coords2);
  var featureDist = Math.sqrt(squaredDist);
  return featureDist;
};


/**
 * Joins two features in one cluster. If origFeature is in a cluster,
 * newFeature is appended to this cluster. If origFeature is not in a cluster,
 * a new cluster is created.
 *
 * @param {ol.Feature} newFeature
 * @param {ol.Feature} origFeature
 */
ol.source.Cluster.prototype.clusterFeatures = function(newFeature,
    origFeature) {
  var origCluster = this.getClusterByFeature(origFeature);
  var newCluster = this.getClusterByFeature(newFeature);
  if (origCluster !== -1 && newCluster !== -1) {
    this.joinClusters(origCluster, newCluster);
  } else if (origCluster !== -1) {
    this.addFeatureToCluster(newFeature, origCluster);
  } else if (newCluster !== -1) {
    this.addFeatureToCluster(origFeature, newCluster);
  } else {
    var cluster = [newFeature, origFeature];
    this.clusters.push(cluster);
  }
};


/**
 * @param {number} index1
 * @param {number} index2
 */
ol.source.Cluster.prototype.joinClusters = function(index1, index2) {
  var cluster1 = this.clusters[index1];
  var cluster2 = this.clusters[index2];
  var joinedCluster = cluster1.concat(cluster2);
  this.clusters.splice(index1, 1);
  this.clusters.splice(index2 - 1, 1);
  this.clusters.push(joinedCluster);
};


/**
 * Inserts a feature to a cluster, specified by its index.
 *
 * @param {ol.Feature} feature
 * @param {number} clusterIndex
 */
ol.source.Cluster.prototype.addFeatureToCluster = function(feature,
    clusterIndex) {
  var cluster = this.clusters[clusterIndex];
  cluster.push(feature);
};


/**
 * Creates an instance of ol.ClusterFeature from each cluster
 */
ol.source.Cluster.prototype.createFeaturesFromClusters = function() {
  this.clearFeatures_();
  for (var i = 0, ii = this.clusters.length; i < ii; i++) {
    var cluster = this.clusters[i];
    if (cluster.length < this.smallestCluster) {
      var features = this.features.concat(cluster);
      this.features = features;
    } else {
      var options = {
        'features': cluster
      };
      var clusterFeature = new ol.ClusterFeature(options);
      this.features.push(clusterFeature);
    }
  }
};


/**
 * @private
 */
ol.source.Cluster.prototype.clearFeatures_ = function() {
  this.features = [];
};


/**
 * @return {?number}
 */
ol.source.Cluster.prototype.getResolution = function() {
  return this.resolution_;
};


/**
 * @param {number} resolution
 */
ol.source.Cluster.prototype.setResolution = function(resolution) {
  this.resolution_ = resolution;
};
