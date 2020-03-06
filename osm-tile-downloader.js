#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var readline = require('readline');
var util = require('util');
var mkdir = require('mkdirp').sync;
var moment = require('moment');
var winston = require('winston');
var options = require('./lib/options')();
var pkgInfo = require('./package');

var log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: options.verbose === true ? 'debug' : 'info',
      timestamp: function () {
        return moment().format('YYYY-MM-DD HH:mm.ss.SSS');
      },
      debugStdout: true,
      handleExceptions: false
    })
  ]
});

var calculateDownloadCount = function (startZoomLevel, endZoomLevel) {
  return _.reduce(_.range(startZoomLevel, endZoomLevel + 1), function (result, zoom) {
    return result + Math.pow(Math.pow(2, zoom), 2);
  }, 0);
};

var confirmDownload = function (downloadCount, cb) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(util.format("Proceed with %s %d tiles? [yes/no] ", options.checkTiles ? 'checking' : 'downloading', downloadCount), function (answer) {
    if (!(/^(?:y|yes)$/i).test(answer)) {
      log.info('Cancelled');
      process.exit(0);
    }
    cb();
    rl.close();
  });
};

var downloadTile = function (tile, startZoomLevel, endZoomLevel, retryCount) {
  retryCount = retryCount || 0;
  if (!tile) {
    log.info('Done %s tiles', options.checkTiles ? 'checking' : 'downloading');
    return;
  }

  if ((options.forceOverwrite === false && !fs.existsSync(tile.file)) || options.forceOverwrite === true) {
    if (options.checkTiles) {
      log.info("Tile '%s' is missing", tile.file);
      setImmediate(function () {
        downloadTile(nextTile(startZoomLevel, endZoomLevel, tile), startZoomLevel, endZoomLevel);
      });
    }
    else {
      log.debug('Download %s', tile.url);
      mkdir(path.dirname(tile.file));
      var httpObj = tile.url.toString().startsWith("https") ? https : http;
      var req = httpObj.request(tile.url, { headers : {'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0'} }, function (resp) {
        if (resp.statusCode !== 200) {
          log.error('Unexpected status code: %d (url: %s), retrying in %d ms', resp.statusCode, tile.url, options.retryDelay);
          setTimeout(function () {
            if (retryCount < options.maxRetries) {
              retryCount++;
              log.info("Retrying %s", tile.url);
              // tiles.unshift(tile); // TODO: tiles not set
            }
            else {
              log.info("Skipping tile: %s", tile.url);
            }
            downloadTile(nextTile(startZoomLevel, endZoomLevel, tile), startZoomLevel, endZoomLevel, retryCount);
          }, options.retryDelay);
        }
        else {
          resp.on('error', function (error) {
            log.error('Error in response', error);
            process.exit(3);
          });

          resp.on('end', function () {
            log.debug('Done saving %s', tile.file);
            setTimeout(function () {
              downloadTile(nextTile(startZoomLevel, endZoomLevel, tile), startZoomLevel, endZoomLevel);
            }, options.delay);
          });

          log.debug('Saving %s', tile.file);
          var output = fs.createWriteStream(tile.file);
          resp.pipe(output);
        }
      });

      req.on('error', function (error) {
        log.error('Error in request', error);
        process.exit(2);
      });
      req.end();
    }
  }
  else {
    setImmediate(function () {
      if (!options.checkTiles) {
        log.debug('Skip downloading %s, already downloaded', tile.url);
      }
      downloadTile(nextTile(startZoomLevel, endZoomLevel, tile), startZoomLevel, endZoomLevel);
    });
  }
};

var increaseTileCount = function () {
  // keeps track of tiles downloaded/checked and outputs progress info for every 10% completed
  tileCount++;
  var currentPercentage = Math.floor(Math.floor((tileCount / tilesToDownload) * 100) / 10) * 10;
  if (currentPercentage !== tileCountPercentage) {
    tileCountPercentage = currentPercentage;
    log.info("%d%% complete", tileCountPercentage);
  }
};

var nextTile = function (startZoomLevel, endZoomLevel, currentTile) {
  var createTile = function (zoom, x, y) {
    increaseTileCount();
    return {
      zoom: zoom,
      x: x,
      y: y,
      file: path.join(options.outputDir, zoom.toString(), x.toString(), y.toString()) + '.png',
      url: options.url.replace(/{z}/g, zoom).replace(/{x}/g, x).replace(/{y}/g, y)
    }
  };

  if (!currentTile) {
    return createTile(startZoomLevel, 0, 0);
  }

  var zoom = currentTile.zoom, x = currentTile.x, y = currentTile.y;
  var maxTile = Math.pow(2, zoom) - 1;

  if (x === maxTile && y === maxTile && zoom === endZoomLevel) {
    return void 0;  // all done return nothing
  }

  if (x === maxTile && y === maxTile && zoom <= endZoomLevel) {
    // start over with next zoom level
    x = 0;
    y = 0;
    zoom++;
  }
  else if (y === maxTile) {
    x++;
    y = 0;
  }
  else {
    y++;
  }

  return createTile(zoom, x, y);
};

log.info('OSM Tile Downloader v%s', pkgInfo.version);
log.info('Start zoom level: %d', options.startZoomLevel);
log.info('End zoom level: %d', options.endZoomLevel);
if (!options.checkTiles) {
  log.info('URL: %s', options.url);
}
log.info('Output directory: %s', options.outputDir);
log.debug('Configuration:');
log.debug('  Verbose mode: %s', options.verbose ? 'yes' : 'no');
log.debug('  Check tiles: %s', options.checkTiles ? 'yes' : 'no');
log.debug('  Force overwrite: %s', options.forceOverwrite ? 'yes' : 'no');
log.debug('  Yes: %s', options.yes ? 'yes' : 'no');
log.debug('  Delay: %d ms', options.delay);
log.debug('  Max retries: %d', options.maxRetries);
log.debug('  Retry delay: %d ms', options.retryDelay);

var tilesToDownload = calculateDownloadCount(options.startZoomLevel, options.endZoomLevel),
  tileCount = 0,
  tileCountPercentage = 0;

var go = function () {
  log.info("Starting to %s %d tiles", options.checkTiles ? 'check' : 'download', tilesToDownload);
  downloadTile(nextTile(options.startZoomLevel, options.endZoomLevel), options.startZoomLevel, options.endZoomLevel);
};

if (options.yes) {
  go();
}
else {
  confirmDownload(tilesToDownload, go);
}
