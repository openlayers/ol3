goog.provide('ol.structs.RTree');

goog.require('ol.Rectangle');



/**
 * @private
 * @constructor
 * @param {number} minX Minimum X.
 * @param {number} minY Minimum Y.
 * @param {number} maxX Maximum X.
 * @param {number} maxY Maximum Y.
 * @param {ol.structs.RTreeNode_} parent Parent node.
 * @param {number} level Level in the tree hierarchy.
 * @extends {ol.Rectangle}
 */
ol.structs.RTreeNode_ = function(minX, minY, maxX, maxY, parent, level) {

  goog.base(this, minX, minY, maxX, maxY);

  /**
   * @type {Object}
   */
  this.object;

  /**
   * @type {string}
   */
  this.objectId;

  /**
   * @type {ol.structs.RTreeNode_}
   */
  this.parent = parent;

  /**
   * @type {number}
   */
  this.level = level;

  /**
   * @type {Object.<string, boolean>}
   */
  this.types = {};

  /**
   * @type {Array.<ol.structs.RTreeNode_>}
   */
  this.children = [];

};
goog.inherits(ol.structs.RTreeNode_, ol.Rectangle);


/**
 * Find all objects intersected by a rectangle.
 * @param {ol.Rectangle} bounds Bounding box.
 * @param {Object.<string, Object>} results Target object for results.
 * @param {string=} opt_type Type for another indexing dimension.
 */
ol.structs.RTreeNode_.prototype.find = function(bounds, results, opt_type) {
  if (this.intersects(bounds) &&
      (!goog.isDef(opt_type) || this.types[opt_type] === true)) {
    var numChildren = this.children.length;
    if (numChildren === 0) {
      if (goog.isDef(this.object)) {
        results[this.objectId] = this.object;
      }
    } else {
      for (var i = 0; i < numChildren; ++i) {
        this.children[i].find(bounds, results, opt_type);
      }
    }
  }
};


/**
 * Find the appropriate node for insertion.
 * @param {ol.Rectangle} bounds Bounding box.
 * @return {ol.structs.RTreeNode_|undefined} Matching node.
 */
ol.structs.RTreeNode_.prototype.get = function(bounds) {
  if (this.intersects(bounds)) {
    var numChildren = this.children.length;
    if (numChildren === 0) {
      return goog.isNull(this.parent) ? this : this.parent;
    }
    var node;
    for (var i = 0; i < numChildren; ++i) {
      node = this.children[i].get(bounds);
      if (goog.isDef(node)) {
        return node;
      }
    }
    return this;
  }
};


/**
 * Update boxes up to the root to ensure correct bounding
 * @param {ol.Rectangle} bounds Bounding box.
 */
ol.structs.RTreeNode_.prototype.update = function(bounds) {
  this.extend(bounds);
  if (!goog.isNull(this.parent)) {
    this.parent.update(bounds);
  }
};


/**
 * Divide @this node's children in half and create two new boxes containing
 * the split items. The top left will be the topmost leftmost child and the
 * bottom right will be the rightmost bottommost child.
 */
ol.structs.RTreeNode_.prototype.divide = function() {
  var numChildren = this.children.length;
  if (numChildren === 0) {
    return;
  }

  var half = Math.ceil(numChildren / 2),
      child, node;

  for (var i = 0; i < numChildren; ++i) {
    child = this.children[i];
    if (i % half === 0) {
      node = new ol.structs.RTreeNode_(child.minX, child.minY,
          child.maxX, child.maxY, this, this.level + 1);
      goog.object.extend(this.types, node.types);
      this.children.push(node);
    }
    child.parent = /** @type {ol.structs.RTreeNode_} */ (node);
    goog.object.extend(node.types, child.types);
    node.children.push(child);
    node.extend(child);
  }
};



/**
 * @constructor
 */
ol.structs.RTree = function() {

  /**
   * @private
   * @type {ol.structs.RTreeNode_}
   */
  this.root_ = new ol.structs.RTreeNode_(
      Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, null, 0);

};


/**
 * @param {ol.Rectangle} bounds Bounding box.
 * @param {string=} opt_type Type for another indexing dimension.
 * @return {Object.<string, Object>} Results for the passed bounding box.
 */
ol.structs.RTree.prototype.find = function(bounds, opt_type) {
  var results = /** @type {Object.<string, Object>} */ ({});
  this.root_.find(bounds, results, opt_type);
  return results;
};


/**
 * @param {ol.Rectangle} bounds Bounding box.
 * @param {Object} object Object to store with the passed bounds.
 * @param {string=} opt_type Type for another indexing dimension.
 */
ol.structs.RTree.prototype.put = function(bounds, object, opt_type) {
  var found = this.root_.get(bounds);
  if (found) {
    var node = new ol.structs.RTreeNode_(
        bounds.minX, bounds.minY, bounds.maxX, bounds.maxY,
        found, found.level + 1);
    node.object = object;
    node.objectId = goog.getUid(object).toString();

    found.children.push(node);
    found.update(bounds);

    if (goog.isDef(opt_type)) {
      node.types[opt_type] = true;
      found.types[opt_type] = true;
    }

    if (found.children.length >= ol.structs.RTree.MAX_OBJECTS &&
        found.level < ol.structs.RTree.MAX_SUB_DIVISIONS) {
      found.divide();
    }
  }
};


/**
 * @type {number}
 */
ol.structs.RTree.MAX_SUB_DIVISIONS = 6;


/**
 * @type {number}
 */
ol.structs.RTree.MAX_OBJECTS = 6;

