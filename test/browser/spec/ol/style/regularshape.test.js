import Fill from '../../../../../src/ol/style/Fill.js';
import RegularShape from '../../../../../src/ol/style/RegularShape.js';
import Stroke from '../../../../../src/ol/style/Stroke.js';

describe('ol.style.RegularShape', function () {
  describe('#constructor', function () {
    it('can use rotateWithView', function () {
      const style = new RegularShape({
        rotateWithView: true,
        radius: 0,
      });
      expect(style.getRotateWithView()).to.be(true);
    });

    it('can use radius', function () {
      const style = new RegularShape({
        radius: 5,
        radius2: 10,
      });
      expect(style.getRadius()).to.eql(5);
      expect(style.getRadius2()).to.eql(10);
    });

    it('can use radius1 as an alias for radius', function () {
      const style = new RegularShape({
        radius1: 5,
        radius2: 10,
      });
      expect(style.getRadius()).to.eql(5);
      expect(style.getRadius2()).to.eql(10);
    });

    it('creates a canvas (no fill-style)', function () {
      const style = new RegularShape({radius: 10});
      expect(style.getImage(1)).to.be.an(HTMLCanvasElement);
      expect(style.getSize()).to.eql([20, 20]);
      expect(style.getImageSize()).to.eql([20, 20]);
      expect(style.getOrigin()).to.eql([0, 0]);
      expect(style.getAnchor()).to.eql([10, 10]);
      // no hit-detection image is created, because no fill style is set
      expect(style.getImage(1)).to.be(style.getHitDetectionImage());
      expect(style.getHitDetectionImage()).to.be.an(HTMLCanvasElement);
    });

    it('creates a canvas (transparent fill-style)', function () {
      const style = new RegularShape({
        radius: 10,
        fill: new Fill({
          color: 'transparent',
        }),
      });
      expect(style.getImage(1)).to.be.an(HTMLCanvasElement);
      expect(style.getImage(1).width).to.be(20);
      expect(style.getImage(2).width).to.be(40);
      expect(style.getPixelRatio(2)).to.be(2);
      expect(style.getSize()).to.eql([20, 20]);
      expect(style.getImageSize()).to.eql([20, 20]);
      expect(style.getOrigin()).to.eql([0, 0]);
      expect(style.getAnchor()).to.eql([10, 10]);
      // hit-detection image is created, because transparent fill style is set
      expect(style.getImage(1)).to.not.be(style.getHitDetectionImage());
      expect(style.getHitDetectionImage()).to.be.an(HTMLCanvasElement);
      expect(style.getHitDetectionImage().width).to.be(20);
    });

    it('creates a canvas (non-transparent fill-style)', function () {
      const style = new RegularShape({
        radius: 10,
        fill: new Fill({
          color: '#FFFF00',
        }),
      });
      expect(style.getImage(1)).to.be.an(HTMLCanvasElement);
      expect(style.getSize()).to.eql([20, 20]);
      expect(style.getImageSize()).to.eql([20, 20]);
      expect(style.getOrigin()).to.eql([0, 0]);
      expect(style.getAnchor()).to.eql([10, 10]);
      // no hit-detection image is created, because non-transparent fill style is set
      expect(style.getImage(1)).to.be(style.getHitDetectionImage());
      expect(style.getHitDetectionImage()).to.be.an(HTMLCanvasElement);
    });

    it('sets default displacement [0, 0]', function () {
      const style = new RegularShape({
        radius: 5,
      });
      expect(style.getDisplacement()).to.an('array');
      expect(style.getDisplacement()[0]).to.eql(0);
      expect(style.getDisplacement()[1]).to.eql(0);
      expect(style.getAnchor()).to.eql([5, 5]);
    });
    it('will use the larger radius to calculate the size', function () {
      let style = new RegularShape({
        radius: 10,
        radius2: 5,
      });
      expect(style.getSize()).to.eql([20, 20]);
      style = new RegularShape({
        radius: 5,
        radius2: 10,
      });
      expect(style.getSize()).to.eql([20, 20]);
    });

    it('can use offset', function () {
      const style = new RegularShape({
        radius: 5,
        displacement: [10, 20],
      });
      expect(style.getDisplacement()).to.an('array');
      expect(style.getDisplacement()[0]).to.eql(10);
      expect(style.getDisplacement()[1]).to.eql(20);
      expect(style.getAnchor()).to.eql([-5, 25]);
      style.setDisplacement([20, 10]);
      expect(style.getDisplacement()).to.an('array');
      expect(style.getDisplacement()[0]).to.eql(20);
      expect(style.getDisplacement()[1]).to.eql(10);
      expect(style.getAnchor()).to.eql([-15, 15]);
    });
  });

  describe('#clone', function () {
    it('creates a new ol.style.RegularShape', function () {
      const original = new RegularShape({
        points: 5,
      });
      const clone = original.clone();
      expect(clone).to.be.an(RegularShape);
      expect(clone).to.not.be(original);
    });

    it('copies all values', function () {
      const original = new RegularShape({
        fill: new Fill({
          color: '#319FD3',
        }),
        points: 5,
        radius: 4,
        radius2: 6,
        angle: 1,
        stroke: new Stroke({
          color: '#319FD3',
        }),
        rotation: 2,
        rotateWithView: true,
        displacement: [10, 20],
      });
      original.setOpacity(0.5);
      original.setScale(1.5);
      const clone = original.clone();
      expect(original.getAngle()).to.eql(clone.getAngle());
      expect(original.getFill().getColor()).to.eql(clone.getFill().getColor());
      expect(original.getOpacity()).to.eql(clone.getOpacity());
      expect(original.getPoints()).to.eql(clone.getPoints());
      expect(original.getRadius()).to.eql(clone.getRadius());
      expect(original.getRadius2()).to.eql(clone.getRadius2());
      expect(original.getRotation()).to.eql(clone.getRotation());
      expect(original.getRotateWithView()).to.eql(clone.getRotateWithView());
      expect(original.getScale()).to.eql(clone.getScale());
      expect(original.getStroke().getColor()).to.eql(
        clone.getStroke().getColor()
      );
      expect(original.getDisplacement()[0]).to.eql(clone.getDisplacement()[0]);
      expect(original.getDisplacement()[1]).to.eql(clone.getDisplacement()[1]);
    });

    it('the clone does not reference the same objects as the original', function () {
      const original = new RegularShape({
        fill: new Fill({
          color: '#319FD3',
        }),
        stroke: new Stroke({
          color: '#319FD3',
        }),
        displacement: [0, 5],
      });
      const clone = original.clone();
      expect(original.getFill()).to.not.be(clone.getFill());
      expect(original.getStroke()).to.not.be(clone.getStroke());
      expect(original.getDisplacement()).to.not.be(clone.getDisplacement());

      clone.getFill().setColor('#012345');
      clone.getStroke().setColor('#012345');
      expect(original.getFill().getColor()).to.not.eql(
        clone.getFill().getColor()
      );
      expect(original.getStroke().getColor()).to.not.eql(
        clone.getStroke().getColor()
      );
    });
  });

  describe('#createPath_', function () {
    let canvas;
    beforeEach(function () {
      canvas = {
        arc: sinon.spy(),
        lineTo: sinon.spy(),
        closePath: sinon.spy(),
      };
    });
    it('does not double the points without radius2', function () {
      const style = new RegularShape({
        radius: 10,
        points: 4,
      });
      style.createPath_(canvas);
      expect(canvas.arc.callCount).to.be(0);
      expect(canvas.lineTo.callCount).to.be(4);
      expect(canvas.closePath.callCount).to.be(1);
    });
    it('doubles the points with radius2', function () {
      const style = new RegularShape({
        radius: 10,
        radius2: 12,
        points: 4,
      });
      style.createPath_(canvas);
      expect(canvas.arc.callCount).to.be(0);
      expect(canvas.lineTo.callCount).to.be(8);
      expect(canvas.closePath.callCount).to.be(1);
    });
    it('doubles the points when radius2 equals radius', function () {
      const style = new RegularShape({
        radius: 10,
        radius2: 10,
        points: 4,
      });
      style.createPath_(canvas);
      expect(canvas.arc.callCount).to.be(0);
      expect(canvas.lineTo.callCount).to.be(8);
      expect(canvas.closePath.callCount).to.be(1);
    });
  });

  describe('#calculateLineJoinSize_', function () {
    function create({
      radius = 10,
      radius2,
      points = 4,
      strokeWidth = 10,
      lineJoin = 'miter',
      miterLimit = 10,
    }) {
      return new RegularShape({
        radius,
        radius2,
        points,
        stroke: new Stroke({
          color: 'red',
          width: strokeWidth,
          lineJoin,
          miterLimit,
        }),
      });
    }
    describe('polygon', function () {
      it('sets size to diameter', function () {
        const style = create({strokeWidth: 0});
        expect(style.getSize()).to.eql([20, 20]);
      });
      it('sets size to diameter rounded up', function () {
        const style = create({radius: 9.9, strokeWidth: 0});
        expect(style.getSize()).to.eql([20, 20]);
      });
      it('sets size to diameter plus miter', function () {
        const style = create({});
        expect(style.getSize()).to.eql([35, 35]);
      });
      it('sets size to diameter plus miter with miter limit', function () {
        const style = create({miterLimit: 0});
        expect(style.getSize()).to.eql([28, 28]);
      });
      it('sets size to diameter plus bevel', function () {
        const style = create({lineJoin: 'bevel'});
        expect(style.getSize()).to.eql([28, 28]);
      });
      it('sets size to diameter plus stroke width with round line join', function () {
        const style = create({lineJoin: 'round'});
        expect(style.getSize()).to.eql([30, 30]);
      });
    });
    describe('star', function () {
      it('sets size to diameter plus miter r1 > r2', function () {
        const style = create({radius2: 1, miterLimit: 100});
        expect(style.getSize()).to.eql([152, 152]);
      });
      it('sets size to diameter plus miter r1 < r2', function () {
        const style = create({radius2: 2, points: 7, miterLimit: 100});
        expect(style.getSize()).to.eql([116, 116]);
      });
      it('sets size with spokes through center and outer bevel', function () {
        const style = create({radius2: 80, points: 9, strokeWidth: 90});
        expect(style.getSize()).to.eql([213, 213]);
      });
    });
  });
});
