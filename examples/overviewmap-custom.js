import _ol_Map_ from '../src/ol/map';
import _ol_View_ from '../src/ol/view';
import _ol_control_ from '../src/ol/control';
import _ol_control_OverviewMap_ from '../src/ol/control/overviewmap';
import _ol_interaction_ from '../src/ol/interaction';
import _ol_interaction_DragRotateAndZoom_ from '../src/ol/interaction/dragrotateandzoom';
import _ol_layer_Tile_ from '../src/ol/layer/tile';
import _ol_source_OSM_ from '../src/ol/source/osm';


var overviewMapControl = new _ol_control_OverviewMap_({
  // see in overviewmap-custom.html to see the custom CSS used
  className: 'ol-overviewmap ol-custom-overviewmap',
  layers: [
    new _ol_layer_Tile_({
      source: new _ol_source_OSM_({
        'url': 'https://{a-c}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png' +
            '?apikey=0e6fc415256d4fbb9b5166a718591d71'
      })
    })
  ],
  collapseLabel: '\u00BB',
  label: '\u00AB',
  collapsed: false
});

var map = new _ol_Map_({
  controls: _ol_control_.defaults().extend([
    overviewMapControl
  ]),
  interactions: _ol_interaction_.defaults().extend([
    new _ol_interaction_DragRotateAndZoom_()
  ]),
  layers: [
    new _ol_layer_Tile_({
      source: new _ol_source_OSM_()
    })
  ],
  target: 'map',
  view: new _ol_View_({
    center: [500000, 6000000],
    zoom: 7
  })
});
