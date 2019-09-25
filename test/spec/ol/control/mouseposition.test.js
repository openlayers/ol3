import Map from '../../../../src/ol/Map.js';
import MousePosition from '../../../../src/ol/control/MousePosition.js';
import View from '../../../../src/ol/View.js';
import EventType from '../../../../src/ol/pointer/EventType.js';

describe('ol/control/MousePosition', () => {

  describe('constructor', () => {

    test('can be constructed without arguments', () => {
      const instance = new MousePosition();
      expect(instance).toBeInstanceOf(MousePosition);
      expect(instance.element.className).toBe('ol-mouse-position');
    });

    test('creates the element with the provided class name', () => {
      const className = 'foobar';
      const instance = new MousePosition({
        className: className
      });
      expect(instance.element.className).toBe(className);
    });

  });

  describe('configuration options', () => {
    let target, map;
    const width = 360;
    const height = 180;

    beforeEach(() => {
      target = document.createElement('div');
      const style = target.style;
      style.position = 'absolute';
      style.left = '-1000px';
      style.top = '-1000px';
      style.width = width + 'px';
      style.height = height + 'px';

      document.body.appendChild(target);
      map = new Map({
        target: target,
        controls: [],
        view: new View({
          projection: 'EPSG:4326',
          center: [0, 0],
          resolution: 1
        })
      });
    });
    afterEach(() => {
      map.dispose();
      document.body.removeChild(target);
    });

    function simulateEvent(type, x, y) {
      const viewport = map.getViewport();
      // calculated in case body has top < 0 (test runner with small window)
      const position = viewport.getBoundingClientRect();
      const evt = new PointerEvent(type, {
        clientX: position.left + x + width / 2,
        clientY: position.top + y + height / 2
      });
      document.querySelector('div.ol-viewport').dispatchEvent(evt);
    }

    describe('undefinedHTML', () => {
      test('renders undefinedHTML when mouse moves out', () => {
        const ctrl = new MousePosition({
          undefinedHTML: 'some text'
        });
        ctrl.setMap(map);
        map.renderSync();

        const element = document.querySelector('.ol-mouse-position', map.getTarget());

        simulateEvent(EventType.POINTEROUT, width + 1, height + 1);
        expect(element.innerHTML).toBe('some text');

        simulateEvent(EventType.POINTERMOVE, 20, 30);
        expect(element.innerHTML).toBe('20,-30');

        simulateEvent(EventType.POINTEROUT, width + 1, height + 1);
        expect(element.innerHTML).toBe('some text');
      });

      test(
        'clears the mouse position by default when the mouse moves outside the viewport',
        () => {
          const ctrl = new MousePosition();
          ctrl.setMap(map);
          map.renderSync();

          const element = document.querySelector('.ol-mouse-position', map.getTarget());

          simulateEvent(EventType.POINTEROUT, width + 1, height + 1);
          expect(element.innerHTML).toBe('&nbsp;');

          target.dispatchEvent(new PointerEvent('pointermove'));
          simulateEvent(EventType.POINTERMOVE, 20, 30);
          expect(element.innerHTML).toBe('20,-30');

          simulateEvent(EventType.POINTEROUT, width + 1, height + 1);
          expect(element.innerHTML).toBe('&nbsp;');
        }
      );

      test(
        'retains the mouse position when undefinedHTML is falsey and mouse moves outside the viewport',
        () => {
          const ctrl = new MousePosition({
            undefinedHTML: ''
          });
          ctrl.setMap(map);
          map.renderSync();

          const element = document.querySelector('.ol-mouse-position', map.getTarget());

          simulateEvent(EventType.POINTEROUT, width + 1, height + 1);
          expect(element.innerHTML).toBe('');

          target.dispatchEvent(new PointerEvent('pointermove'));
          simulateEvent(EventType.POINTERMOVE, 20, 30);
          expect(element.innerHTML).toBe('20,-30');

          simulateEvent(EventType.POINTEROUT, width + 1, height + 1);
          expect(element.innerHTML).toBe('20,-30');
        }
      );
    });
  });
});
