import _ol_Map_ from '../src/ol/map';
import _ol_View_ from '../src/ol/view';
import _ol_format_GeoJSON_ from '../src/ol/format/geojson';
import _ol_interaction_ from '../src/ol/interaction';
import _ol_interaction_Modify_ from '../src/ol/interaction/modify';
import _ol_interaction_Select_ from '../src/ol/interaction/select';
import _ol_layer_Vector_ from '../src/ol/layer/vector';
import _ol_source_Vector_ from '../src/ol/source/vector';
import _ol_style_Circle_ from '../src/ol/style/circle';
import _ol_style_Fill_ from '../src/ol/style/fill';
import _ol_style_Stroke_ from '../src/ol/style/stroke';
import _ol_style_Style_ from '../src/ol/style/style';


var styleFunction = (function() {
  var styles = {};
  var image = new _ol_style_Circle_({
    radius: 5,
    fill: null,
    stroke: new _ol_style_Stroke_({color: 'orange', width: 2})
  });
  styles['Point'] = new _ol_style_Style_({image: image});
  styles['Polygon'] = new _ol_style_Style_({
    stroke: new _ol_style_Stroke_({
      color: 'blue',
      width: 3
    }),
    fill: new _ol_style_Fill_({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  });
  styles['MultiLineString'] = new _ol_style_Style_({
    stroke: new _ol_style_Stroke_({
      color: 'green',
      width: 3
    })
  });
  styles['MultiPolygon'] = new _ol_style_Style_({
    stroke: new _ol_style_Stroke_({
      color: 'yellow',
      width: 1
    }),
    fill: new _ol_style_Fill_({
      color: 'rgba(255, 255, 0, 0.1)'
    })
  });
  styles['default'] = new _ol_style_Style_({
    stroke: new _ol_style_Stroke_({
      color: 'red',
      width: 3
    }),
    fill: new _ol_style_Fill_({
      color: 'rgba(255, 0, 0, 0.1)'
    }),
    image: image
  });
  return function(feature) {
    return styles[feature.getGeometry().getType()] || styles['default'];
  };
})();

var geojsonObject = {
  'type': 'FeatureCollection',
  'crs': {
    'type': 'name',
    'properties': {
      'name': 'EPSG:3857'
    }
  },
  'features': [{
    'type': 'Feature',
    'geometry': {
      'type': 'Point',
      'coordinates': [0, 0]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'MultiPoint',
      'coordinates': [[-2e6, 0], [0, -2e6]]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'LineString',
      'coordinates': [[4e6, -2e6], [8e6, 2e6], [9e6, 2e6]]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'LineString',
      'coordinates': [[4e6, -2e6], [8e6, 2e6], [8e6, 3e6]]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'Polygon',
      'coordinates': [[[-5e6, -1e6], [-4e6, 1e6],
        [-3e6, -1e6], [-5e6, -1e6]], [[-4.5e6, -0.5e6],
        [-3.5e6, -0.5e6], [-4e6, 0.5e6], [-4.5e6, -0.5e6]]]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'MultiLineString',
      'coordinates': [
        [[-1e6, -7.5e5], [-1e6, 7.5e5]],
        [[-1e6, -7.5e5], [-1e6, 7.5e5], [-5e5, 0], [-1e6, -7.5e5]],
        [[1e6, -7.5e5], [15e5, 0], [15e5, 0], [1e6, 7.5e5]],
        [[-7.5e5, -1e6], [7.5e5, -1e6]],
        [[-7.5e5, 1e6], [7.5e5, 1e6]]
      ]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'MultiPolygon',
      'coordinates': [
        [[[-5e6, 6e6], [-5e6, 8e6], [-3e6, 8e6],
          [-3e6, 6e6], [-5e6, 6e6]]],
        [[[-3e6, 6e6], [-2e6, 8e6], [0, 8e6],
          [0, 6e6], [-3e6, 6e6]]],
        [[[1e6, 6e6], [1e6, 8e6], [3e6, 8e6],
          [3e6, 6e6], [1e6, 6e6]]]
      ]
    }
  }, {
    'type': 'Feature',
    'geometry': {
      'type': 'GeometryCollection',
      'geometries': [{
        'type': 'LineString',
        'coordinates': [[-5e6, -5e6], [0, -5e6]]
      }, {
        'type': 'Point',
        'coordinates': [4e6, -5e6]
      }, {
        'type': 'Polygon',
        'coordinates': [
          [[1e6, -6e6], [2e6, -4e6], [3e6, -6e6], [1e6, -6e6]]
        ]
      }]
    }
  }]
};

var source = new _ol_source_Vector_({
  features: (new _ol_format_GeoJSON_()).readFeatures(geojsonObject)
});

var layer = new _ol_layer_Vector_({
  source: source,
  style: styleFunction
});

var overlayStyle = (function() {
  var styles = {};
  styles['Polygon'] = [
    new _ol_style_Style_({
      fill: new _ol_style_Fill_({
        color: [255, 255, 255, 0.5]
      })
    }),
    new _ol_style_Style_({
      stroke: new _ol_style_Stroke_({
        color: [255, 255, 255, 1],
        width: 5
      })
    }),
    new _ol_style_Style_({
      stroke: new _ol_style_Stroke_({
        color: [0, 153, 255, 1],
        width: 3
      })
    })
  ];
  styles['MultiPolygon'] = styles['Polygon'];

  styles['LineString'] = [
    new _ol_style_Style_({
      stroke: new _ol_style_Stroke_({
        color: [255, 255, 255, 1],
        width: 5
      })
    }),
    new _ol_style_Style_({
      stroke: new _ol_style_Stroke_({
        color: [0, 153, 255, 1],
        width: 3
      })
    })
  ];
  styles['MultiLineString'] = styles['LineString'];

  styles['Point'] = [
    new _ol_style_Style_({
      image: new _ol_style_Circle_({
        radius: 7,
        fill: new _ol_style_Fill_({
          color: [0, 153, 255, 1]
        }),
        stroke: new _ol_style_Stroke_({
          color: [255, 255, 255, 0.75],
          width: 1.5
        })
      }),
      zIndex: 100000
    })
  ];
  styles['MultiPoint'] = styles['Point'];

  styles['GeometryCollection'] = styles['Polygon'].concat(styles['Point']);

  return function(feature) {
    return styles[feature.getGeometry().getType()];
  };
})();

var select = new _ol_interaction_Select_({
  style: overlayStyle
});

var modify = new _ol_interaction_Modify_({
  features: select.getFeatures(),
  style: overlayStyle,
  insertVertexCondition: function() {
    // prevent new vertices to be added to the polygons
    return !select.getFeatures().getArray().every(function(feature) {
      return feature.getGeometry().getType().match(/Polygon/);
    });
  }
});

var map = new _ol_Map_({
  interactions: _ol_interaction_.defaults().extend([select, modify]),
  layers: [layer],
  target: 'map',
  view: new _ol_View_({
    center: [0, 1000000],
    zoom: 2
  })
});
