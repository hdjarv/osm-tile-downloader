'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var program = require('commander');
var util = require('util');
var url = require('url');
var pkgInfo = require('../package.json');

var showErrorMessageAndExit = function (msg) {
  console.error();
  console.error("  error: %s", msg);
  console.error();
  process.exit(1);
};

var invalidArgumentValue = function (argument, value) {
  showErrorMessageAndExit(util.format("option '%s' invalid value, got '%s'", argument, value));
};

var parseIntValue = function (name) {
  return function (value) {
    var v = parseInt(value);
    if (_.isFinite(v)) {
      return v;
    }

    invalidArgumentValue(name, value);
  };
};

var options;

module.exports = function () {
  if (_.isUndefined(options)) {
    options = program
      .description('Download map tile images from OSM tile server')
      .version(pkgInfo.version)
      // Required options
      .option('-s, --start-zoom-level <n>', 'Zoom level start', parseIntValue('-s, --start-zoom-level <n>'))
      .option('-e, --end-zoom-level <n>', 'Zoom level end', parseIntValue('-e, --end-zoom-level <n>'))
      .option('-u, --url <url>', 'Tile server url')
      .option('-o, --output-dir <dir>', 'Output directory')
      // Optional options
      .option('-v, --verbose', 'Verbose mode, default is off')
      .option('-c, --check-tiles', 'Check if the expected tiles exist in output directory instead of downloading them')
      .option('-d, --delay <ms>', 'Delay in ms between downloads, default is 0', parseIntValue('-d, --delay <ms>'))
      .option('-m, --max-retries <num>', 'Maximum number of retries for download, default is 3', parseIntValue('-m, --max-retries <num>'))
      .option('-r, --retry-delay <ms>', 'Delay in ms between download retries, default is 2500', parseIntValue('-r, --retry-delay <ms>'))
      .option('-f, --force-overwrite', 'Force overwriting existing tiles (re-downloads all tiles), default is off')
      .option('-y, --yes', 'Answer yes to prompt confirming downloading of tiles, default is off')
      .parse(process.argv);

    // Set default options unless they were set
    program.verbose = program.verbose === true;
    program.checkTiles = program.checkTiles === true;
    program.forceOverwrite = program.forceOverwrite === true;
    program.yes = program.yes === true;
    program.delay = (_.isFinite(program.delay) && program.delay >= 0) ? program.delay : 0;
    program.maxRetries = (_.isFinite(program.maxRetries) && program.maxRetries >= 0) ? program.maxRetries : 3;
    program.retryDelay = (_.isFinite(program.retryDelay) && program.retryDelay >= 0) ? program.retryDelay : 2500;

    if (program.forceOverwrite && program.checkTiles) {
      showErrorMessageAndExit("Can't use both -f (--force-overwrite) & -c (--check-tiles) options");
    }

    // Validate required options exist and have valid values.
    if (!_.isNumber(program.startZoomLevel)) {
      program.missingArgument('-s, --start-zoom-level <n>');
    }
    else {
      if (program.startZoomLevel < 0 || program.startZoomLevel > 19) {
        invalidArgumentValue('-s, --start-zoom-level <n>', program.startZoomLevel);
      }
    }

    if (!_.isNumber(program.endZoomLevel)) {
      program.missingArgument('-e, --end-zoom-level <n>');
    }
    else {
      if (program.endZoomLevel < 0 || program.endZoomLevel > 19) {
        invalidArgumentValue('-e, --end-zoom-level <n>', program.endZoomLevel);
      }
      else {
        if (program.startZoomLevel > program.endZoomLevel) {
          showErrorMessageAndExit('Start zoom level must be lower than end zoom level');
        }
      }
    }

    if (!_.isString(program.url)) {
      if (!program.checkTiles) { // No url needed to check tiles
        program.missingArgument('-u, --url <url>');
      }
    }
    else {
      var u = url.parse(program.url);
      if (!/^https?:/.test(u.protocol)) {
        invalidArgumentValue('-u, --url <url>', program.url);
      }
      if (_.isEmpty(u.hostname)) {
        invalidArgumentValue('-u, --url <url>', program.url);
      }
      var p = decodeURIComponent(u.path);
      if (!(/{z}/.test(p) && /{x}/.test(p) && /{y}/.test(p))) {
        invalidArgumentValue('-u, --url <url>', program.url);
      }
    }

    if (!_.isString(program.outputDir)) {
      program.missingArgument('-o, --output-dir <dir>');
    }
    else {
      program.outputDir = path.resolve(program.outputDir);
      if (!fs.existsSync(program.outputDir)) {
        showErrorMessageAndExit(util.format("Output directory '%s' does not exit", program.outputDir));
      }
      else {
        var stat = fs.statSync(program.outputDir);
        if (!stat.isDirectory()) {
          showErrorMessageAndExit(util.format("Output directory '%s' is not a directory", program.outputDir));
        }
      }
    }
  }
  return options;
};
