import Icon from '../../../../../src/ol/style/Icon.js';
import IconImage, {
  get as getIconImage,
} from '../../../../../src/ol/style/IconImage.js';
import {getUid} from '../../../../../src/ol/util.js';
import {shared as iconImageCache} from '../../../../../src/ol/style/IconImageCache.js';

describe('ol.style.Icon', function () {
  const size = [36, 48];
  const src =
    'data:image/gif;base64,' +
    'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';

  describe('constructor', function () {
    it('caches canvas images with a uid as src', function () {
      const canvas = document.createElement('canvas');
      new Icon({
        img: canvas,
        imgSize: size,
      });
      expect(getIconImage(canvas, getUid(canvas), size, '').getImage()).to.eql(
        canvas
      );
    });

    it('imgSize overrides img.width and img.height', function (done) {
      const style = new Icon({
        src: src,
        imgSize: size,
      });
      const iconImage = style.iconImage_;
      iconImage.addEventListener('change', function () {
        expect([iconImage.image_.width, iconImage.image_.height]).to.eql(size);
        done();
      });
      style.load();
    });
  });

  describe('#clone', function () {
    it('creates a new ol.style.Icon', function () {
      const original = new Icon({
        src: src,
      });
      const clone = original.clone();
      expect(clone).to.be.an(Icon);
      expect(clone).to.not.be(original);
    });

    it('copies all values ', function () {
      const canvas = document.createElement('canvas');
      const original = new Icon({
        anchor: [1, 0],
        anchorOrigin: 'bottom-right',
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        color: '#319FD3',
        crossOrigin: 'Anonymous',
        img: canvas,
        imgSize: size,
        offset: [1, 2],
        offsetOrigin: 'bottom-left',
        opacity: 0.5,
        scale: 2,
        rotation: 4,
        size: [10, 12],
      });

      const clone = original.clone();
      expect(original.getImage(1)).to.be(clone.getImage(1));
      expect(original.iconImage_).to.be(clone.iconImage_);
      expect(original.getAnchor()).to.eql(clone.getAnchor());
      expect(original.anchorOrigin_).to.eql(clone.anchorOrigin_);
      expect(original.anchorXUnits_).to.eql(clone.anchorXUnits_);
      expect(original.anchorYUnits_).to.eql(clone.anchorYUnits_);
      expect(original.crossOrigin_).to.eql(clone.crossOrigin_);
      expect(original.getColor()).to.eql(clone.getColor());
      expect(original.offset_).to.eql(clone.offset_);
      expect(original.offsetOrigin_).to.eql(clone.offsetOrigin_);
      expect(original.getSize()).to.eql(clone.getSize());
      expect(original.getSrc()).to.eql(clone.getSrc());
      expect(original.getOpacity()).to.eql(clone.getOpacity());
      expect(original.getRotation()).to.eql(clone.getRotation());
      expect(original.getRotateWithView()).to.eql(clone.getRotateWithView());

      const original2 = new Icon({
        src: src,
      });
      const clone2 = original2.clone();
      expect(original2.getImage(1)).to.be(clone2.getImage(1));
      expect(original2.iconImage_).to.be(clone2.iconImage_);
      expect(original2.getSrc()).to.eql(clone2.getSrc());
    });

    it('the clone does not reference the same objects as the original', function () {
      const original = new Icon({
        anchor: [1, 0],
        color: [1, 2, 3, 0.4],
        src: src,
        offset: [1, 2],
        size: [10, 12],
        displacement: [5, 6],
      });
      const clone = original.clone();
      expect(original.getAnchor()).not.to.be(clone.getAnchor());
      expect(original.offset_).not.to.be(clone.offset_);
      expect(original.getColor()).not.to.be(clone.getColor());
      expect(original.getSize()).not.to.be(clone.getSize());
      expect(original.getDisplacement()).not.to.be(clone.getDisplacement());

      clone.anchor_[0] = 0;
      clone.offset_[0] = 0;
      clone.color_[0] = 0;
      clone.size_[0] = 5;
      clone.displacement_[0] = 10;
      expect(original.anchor_).not.to.eql(clone.anchor_);
      expect(original.offset_).not.to.eql(clone.offset_);
      expect(original.color_).not.to.eql(clone.color_);
      expect(original.size_).not.to.eql(clone.size_);
      expect(original.displacement_).not.to.eql(clone.displacement_);
    });
  });

  describe('#getAnchor', function () {
    const fractionAnchor = [0.25, 0.25];

    it('uses fractional units by default', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: fractionAnchor,
      });
      expect(iconStyle.getAnchor()).to.eql([9, 12]);
    });

    it('uses pixels units', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: [2, 18],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
      });
      expect(iconStyle.getAnchor()).to.eql([2, 18]);
    });

    it('uses a bottom left anchor origin', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: fractionAnchor,
        anchorOrigin: 'bottom-left',
      });
      expect(iconStyle.getAnchor()).to.eql([9, 36]);
    });

    it('uses a bottom right anchor origin', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: fractionAnchor,
        anchorOrigin: 'bottom-right',
      });
      expect(iconStyle.getAnchor()).to.eql([27, 36]);
    });

    it('uses a top right anchor origin', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: fractionAnchor,
        anchorOrigin: 'top-right',
      });
      expect(iconStyle.getAnchor()).to.eql([27, 12]);
    });

    it('uses a top right anchor origin + displacement', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: fractionAnchor,
        anchorOrigin: 'top-right',
        displacement: [20, 10],
      });
      expect(iconStyle.getAnchor()).to.eql([
        size[0] * (1 - fractionAnchor[0]) - 20,
        size[1] * fractionAnchor[1] + 10,
      ]);
    });

    it('uses displacement', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        displacement: [20, 10],
      });
      expect(iconStyle.getAnchor()).to.eql([
        size[0] / 2 - 20,
        size[1] / 2 + 10,
      ]);
      iconStyle.setDisplacement([10, 20]);
      expect(iconStyle.getAnchor()).to.eql([
        size[0] / 2 - 10,
        size[1] / 2 + 20,
      ]);
    });
  });

  describe('#setAnchor', function () {
    it('resets the cached anchor', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        anchor: [0.25, 0.25],
      });
      expect(iconStyle.getAnchor()).to.eql([9, 12]);

      iconStyle.setAnchor([0.5, 0.5]);
      expect(iconStyle.getAnchor()).to.eql([18, 24]);
    });
  });

  describe('#getOrigin', function () {
    const offset = [16, 20];
    const imageSize = [144, 192];

    it('uses a top left offset origin (default)', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        offset: offset,
      });
      expect(iconStyle.getOrigin()).to.eql([16, 20]);
    });

    it('uses a bottom left offset origin', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        offset: offset,
        offsetOrigin: 'bottom-left',
      });
      iconStyle.iconImage_.size_ = imageSize;
      expect(iconStyle.getOrigin()).to.eql([16, 124]);
    });

    it('uses a bottom right offset origin', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        offset: offset,
        offsetOrigin: 'bottom-right',
      });
      iconStyle.iconImage_.size_ = imageSize;
      expect(iconStyle.getOrigin()).to.eql([92, 124]);
    });

    it('uses a top right offset origin', function () {
      const iconStyle = new Icon({
        src: 'test.png',
        size: size,
        offset: offset,
        offsetOrigin: 'top-right',
      });
      iconStyle.iconImage_.size_ = imageSize;
      expect(iconStyle.getOrigin()).to.eql([92, 20]);
    });
  });

  describe('#getImageSize', function () {
    const imgSize = [144, 192];

    it('takes the real image size', function () {
      // pretend that the image is already in the cache,
      // this image will be used for the icon.
      const src = 'test.png';
      const iconImage = new IconImage(null, 'test.png', imgSize);
      iconImageCache.set(src, null, null, iconImage);

      const iconStyle = new Icon({
        src: 'test.png',
      });
      expect(iconStyle.getImageSize()).to.eql(imgSize);
    });

    it('uses the given image size', function () {
      const iconStyle = new Icon({
        img: {src: 'test.png'},
        imgSize: imgSize,
      });
      expect(iconStyle.getImageSize()).to.eql(imgSize);
    });
  });
});
