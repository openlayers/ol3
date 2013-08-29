goog.require('ol.parser.XML');
goog.provide('ol.parser.OSM');

/**
 * @constructor
 * @extends {ol.parser.XML}
 * @param {object} opt_options parser options
 */
ol.parser.OSM = function(opt_options) {

    this.defaultNamespaceURI = 'http://openstreetmap.org/';

    this.readers = {
        'http://openstreetmap.org/': {
            'osm': function(node, object) {
                if (!goog.isDef(object.features)) {
                    object.features = [];
                }
                this.readChildNodes(node, object);
            },
            'node': function(node, object) {
                var container = {properties: {}};
                var id = node.getAttribute('id');
                var lat = parseFloat(node.getAttribute('lat'));
                var lon = parseFloat(node.getAttribute('lon'));

                // save feature properties to attributes
                container.properties = {
                    version: node.getAttribute('version'),
                    timestamp: node.getAttribute('timestamp'),
                    changeset: node.getAttribute('changeset'),
                    uid: node.getAttribute('uid'),
                    user: node.getAttribute('user')
                };

                this.readChildNodes(node, container.properties);

                var feature = new ol.Feature(container.properties);

                // shared vertices are used
                var sharedVertices;
                if (this.readFeaturesOptions_) {
                    var callback = this.readFeaturesOptions_.callback;
                    if (callback) {
                        sharedVertices = callback(feature,
                                ol.geom.GeometryType.POINT);
                    }
                }

                // set feature attributes
                var geometry = new ol.geom.Point([lon, lat], sharedVertices);
                feature.setGeometry(geometry);

                // set feature ID
                feature.setFeatureId(id);

                // push feature to features array
                object.features.push(feature);
            },
            'tag': function(node, object) {
                object[node.getAttribute('k')] = node.getAttribute('v');
            }
        }
    };

    goog.base(this);
};
goog.inherits(ol.parser.OSM, ol.parser.XML);


/**
 * @param {string|Document|Element|Object} data to read
 * @param {Function=} opt_callback Optional callback to call when reading is
 * done.
 * @return {Object} An object representing the document.
 */
ol.parser.OSM.prototype.read = function(data, opt_callback) {
    if (goog.isString(data)) {
        data = goog.dom.xml.loadXml(data);
    }
    if (data && data.nodeType == 9) {
        data = data.documentElement;
    }
    var obj = {};
    this.readNode(data, obj);
    if (goog.isDef(opt_callback)) {
        opt_callback.call(null, [obj]);
    }
    else {
        return obj;
    }
    return null;
};


/**
 * Parse a XAPI document provided as a string.
 * @param {string} str XAPI document.
 * @param {ol.parser.ReadFeaturesOptions=} opt_options Reader options.
 * @return {Array.<ol.Feature>} Array of features.
 */
ol.parser.OSM.prototype.readFeaturesFromString =
    function(str, opt_options) {
  this.readFeaturesOptions_ = opt_options;
  return this.read(str).features;
};
