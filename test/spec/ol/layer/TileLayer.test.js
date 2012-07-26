describe('ol.layer.TileLayer', function() {

    describe('create a tile layer', function() {

        it('returns an ol.layer.TileLayer instance', function() {
            var layer = new ol.layer.TileLayer();
            expect(layer instanceof ol.layer.TileLayer).toBe(true);
        });

    });

    describe('get tile size', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
        });

        it('returns tile size', function() {
            var tilesize = layer.getTileSize();
            expect(tilesize).toEqual([256, 256]);
        });
    });

    describe('axis orientation', function() {
        var layer = new ol.layer.TileLayer();

        it('increases from left to right by default', function() {
            expect(layer.getXRight()).toBe(true);
        });
        it('increases from top to bottom by default', function() {
            expect(layer.getYDown()).toBe(true);
        });
        
        it('allows people to set things backwards', function() {
            var backwards = new ol.layer.TileLayer();
            backwards.setXRight(false);
            expect(backwards.getXRight()).toBe(false);
            backwards.setYDown(false);
            expect(backwards.getYDown()).toBe(false);            
        });

    });

    describe('get tile origin', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
        });

        describe('with tileOriginX and tileOriginY', function() {

            beforeEach(function() {
                layer.setTileOrigin(1, 2);
            });

            it('returns the expected origin', function() {
                var origin = layer.getTileOrigin();
                expect(origin).toEqual([1, 2]);
            });

        });

        describe('with extent', function() {

            beforeEach(function() {
                layer.setExtent(new ol.Bounds(-180, -90, 180, 90));
            });

            it('returns the expected origin', function() {
                var origin = layer.getTileOrigin();
                expect(origin).toEqual([-180, 90]);
            });

        });

        describe('with tileOriginCorner and extent', function() {

            beforeEach(function() {
                layer.setExtent(new ol.Bounds(-180, -90, 180, 90));
                layer.setTileOriginCorner('tr');
            });

            it('returns the expected origin', function() {
                var origin = layer.getTileOrigin();
                expect(origin).toEqual([180, 90]);
            });

        });

        describe('with tileOriginCorner, without extent', function() {

            beforeEach(function() {
                layer.setTileOriginCorner('tr');
            });

            it('throws an error or return null', function() {
                var origin;
                expect(function() {
                    origin = layer.getTileOrigin();
                }).toThrow();
            });

        });

        describe('with bad tileOriginCorner', function() {

            beforeEach(function() {
                layer.setTileOriginCorner('foo');
            });

            it('returns the expected origin', function() {
                expect(function() {
                    var origin = layer.getTileOrigin();
                }).toThrow();
            });

        });
    });

    describe('get resolutions', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
        });

        describe('with resolutions set', function() {

            beforeEach(function() {
                layer.setResolutions([1, 0.5, 0.25]);
            });

            it('returns the expected resolutions', function() {
                var resolutions = layer.getResolutions();
                expect(resolutions).toEqual([1, 0.5, 0.25]);
            });

        });

        describe('with maxResolution and numZoomLevels set', function() {

            beforeEach(function() {
                layer.setMaxResolution(1);
                layer.setNumZoomLevels(3);
            });

            it('returns the expected resolutions', function() {
                var resolutions = layer.getResolutions();
                expect(resolutions).toEqual([1, 0.5, 0.25]);
            });

        });
    });

    describe('get max resolution', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
        });

        describe('with max resolution', function() {

            beforeEach(function() {
                layer.setMaxResolution(156543.03390625);
            });

            it('returns the expected maxResolution', function() {
                var maxResolution = layer.getMaxResolution();
                expect(maxResolution).toEqual(156543.03390625);
            });
        });

        describe('with projection', function() {

            beforeEach(function() {
                layer.setProjection(new ol.Projection("EPSG:3857"));
            });

            it('returns the expected maxResolution', function() {
                var maxResolution = layer.getMaxResolution();
                expect(maxResolution).toEqual(156543.03390625);
            });
        });
    });

    describe('get data from the layer', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
            layer.setUrl('/{z}/{x}/{y}');
            layer.setResolutions([1, 0.5, 0.25]);
            layer.setTileOrigin(-128, 128);
            layer.setExtent(new ol.Bounds(-128, -128, 128, 128));
            // we need a TileLayer implementation, just
            // use duck-typing on the layer instance
            layer.getTileUrl = function(x, y, z) {
                return this.getUrl().replace('{x}', x + '')
                                    .replace('{y}', y + '')
                                    .replace('{z}', z + '');
            };
        });

        describe('extent -128,-128,128,128, resolution 1', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(-128, -128, 128, 128), 1);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(1);
                expect(tiles[0].length).toEqual(1);

                var tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/0/0/0');
                expect(tile.getImg()).toBeDefined();
            });
        });

        describe('extent -192,-192,192,192, resolution 1', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(-192, -192, 192, 192), 1);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(1);
                expect(tiles[0].length).toEqual(1);

                var tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/0/0/0');
                expect(tile.getImg()).toBeDefined();
            });
        });

        describe('extent -128,-128,128,128, resolution 0.5', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(-128, -128, 128, 128), 0.5);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(2);
                expect(tiles[0].length).toEqual(2);

                var tile;

                tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/1/0/0');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[0][1];
                expect(tile.getUrl()).toEqual('/1/1/0');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[1][0];
                expect(tile.getUrl()).toEqual('/1/0/1');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[1][1];
                expect(tile.getUrl()).toEqual('/1/1/1');
                expect(tile.getImg()).toBeDefined();
            });
        });

        describe('extent -64,-64,64,64, resolution 0.5', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(-64, -64, 64, 64), 0.5);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(2);
                expect(tiles[0].length).toEqual(2);

                var tile;

                tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/1/0/0');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[0][1];
                expect(tile.getUrl()).toEqual('/1/1/0');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[1][0];
                expect(tile.getUrl()).toEqual('/1/0/1');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[1][1];
                expect(tile.getUrl()).toEqual('/1/1/1');
                expect(tile.getImg()).toBeDefined();
            });
        });

        describe('extent -96,32,-32,96, resolution 0.5', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(-96, 32, -32, 96), 0.5);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(1);
                expect(tiles[0].length).toEqual(1);

                var tile;

                tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/1/0/0');
                expect(tile.getImg()).toBeDefined();
            });
        });

        describe('extent -32,32,32,96, resolution 0.5', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(-32, 32, 32, 96), 0.5);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(1);
                expect(tiles[0].length).toEqual(2);

                var tile;

                tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/1/0/0');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[0][1];
                expect(tile.getUrl()).toEqual('/1/1/0');
                expect(tile.getImg()).toBeDefined();
            });
        });

        describe('extent 32,-32,96,32, resolution 0.5', function() {

            it('returns the expected data', function() {
                var tileset = layer.getData(
                    new ol.Bounds(32, -32, 96, 32), 0.5);

                var tiles = tileset.getTiles();
                expect(tiles.length).toEqual(2);
                expect(tiles[0].length).toEqual(1);
                expect(tiles[1].length).toEqual(1);

                var tile;

                tile = tiles[0][0];
                expect(tile.getUrl()).toEqual('/1/1/0');
                expect(tile.getImg()).toBeDefined();

                tile = tiles[1][0];
                expect(tile.getUrl()).toEqual('/1/1/1');
                expect(tile.getImg()).toBeDefined();
            });
        });

    });

    describe('get a tile', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
            layer.setUrl('/{z}/{x}/{y}');
            layer.setResolutions([1, 0.5, 0.25]);
            layer.setTileOrigin(-128, 128);
            // we need a TileLayer implementation, just
            // use duck-typing on the layer instance
            layer.getTileUrl = function(x, y, z) {
                return this.getUrl().replace('{x}', x + '')
                                    .replace('{y}', y + '')
                                    .replace('{z}', z + '');
            };
        });

        it('returns the expected tile', function() {
            var tile = layer.getTileForXYZ(1, 2, 2);
            expect(tile.getUrl()).toEqual('/2/1/2');
        });

    });

    describe('test x y validity', function() {
        var layer;

        beforeEach(function() {
            layer = new ol.layer.TileLayer();
            layer.setTileOrigin(0, 0);
            layer.setResolutions([1, 0.5, 0.25]);
        });

        describe('tile index goes right/down', function() {

            beforeEach(function() {
                layer.setXRight(true);
                layer.setYDown(true);
            });

            describe('extent is right/down of origin', function() {

                describe('extent and tile boundaries match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(128, -384, 384, -128));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(0, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 0, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 3, 1);
                        expect(v).toBeFalsy();
                    });
                });

                describe('extent and tile boundaries do not match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(192, -448, 448, -192));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(0, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(4, 0, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(4, 1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(4, 2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(4, 3, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(4, 4, 1);
                        expect(v).toBeFalsy();
                    });
                });

            });

            describe('extent is left/up of origin', function() {

                describe('extent and tile boundaries match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(-384, 128, -128, 384));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(-1, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -3, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -4, 1);
                        expect(v).toBeFalsy();
                    });
                });

                describe('extent and tile boundaries do not match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(-448, 192, -192, 448));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(-1, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-5, -1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-5, -2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-5, -3, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -4, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -4, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -4, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-5, -4, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-5, -5, 1);
                        expect(v).toBeFalsy();
                    });
                });
            });
        });

        describe('tile index goes left/up', function() {

            beforeEach(function() {
                layer.setXRight(false);
                layer.setYDown(false);
            });

            describe('extent is right/down of origin', function() {

                describe('extent and tile boundaries match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(128, -384, 384, -128));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(-1, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -3, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -4, 1);
                        expect(v).toBeFalsy();
                    });
                });

                describe('extent and tile boundaries do not match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(192, -448, 448, -192));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(-1, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-5, -1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-5, -2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-5, -3, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -4, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-3, -4, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-4, -4, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(-5, -4, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(-1, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-2, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-3, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-4, -5, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(-5, -5, 1);
                        expect(v).toBeFalsy();
                    });
                });
            });

            describe('extent is left/up of origin', function() {

                describe('extent and tile boundaries match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(-384, 128, -128, 384));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(0, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 0, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 3, 1);
                        expect(v).toBeFalsy();
                    });
                });

                describe('extent and tile boundaries do not match', function() {

                    beforeEach(function() {
                        layer.setExtent(new ol.Bounds(-448, 192, -192, 448));
                    });

                    it('detects valid x y', function() {
                        var v;
                        v = layer.validXY(0, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 0, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(4, 0, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 1, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 1, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(4, 1, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 2, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 2, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(4, 2, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 3, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(2, 3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(3, 3, 1);
                        expect(v).toBeTruthy();
                        v = layer.validXY(4, 3, 1);
                        expect(v).toBeFalsy();

                        v = layer.validXY(0, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(1, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(2, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(3, 4, 1);
                        expect(v).toBeFalsy();
                        v = layer.validXY(4, 4, 1);
                        expect(v).toBeFalsy();
                    });
                });
            });
        });
    });
});
