import Map from '../src/ol/Map.js';
import TileLayer from '../src/ol/layer/WebGLTile.js';
import View from '../src/ol/View.js';
import XYZ from '../src/ol/source/XYZ.js';

const key = 'get_your_own_D6rA4zTHduk6KOKTXzGB';
const attributions =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

const variables = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
};

const layer = new TileLayer({
  style: {
    exposure: ['var', 'exposure'],
    contrast: ['var', 'contrast'],
    saturation: ['var', 'saturation'],
    variables: variables,
  },
  source: new XYZ({
    crossOrigin: 'anonymous', // TODO: determine if we can avoid this
    attributions: attributions,
    url: 'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=' + key,
    maxZoom: 20,
  }),
});

const map = new Map({
  target: 'map',
  layers: [layer],
  view: new View({
    center: [0, 0],
    zoom: 0,
  }),
});

for (const name in variables) {
  const element = document.getElementById(name);
  const value = variables[name];
  element.value = value.toString();
  document.getElementById(`${name}-value`).innerText = `(${value})`;

  element.addEventListener('input', function (event) {
    const value = parseFloat(event.target.value);
    document.getElementById(`${name}-value`).innerText = `(${value})`;

    const updates = {};
    updates[name] = value;
    layer.updateStyleVariables(updates);
  });
}
