# osm-tile-downloader

Script for downloading map tile images from an OSM tile server.

**Note:** This script may cause substantial traffic towards the tile server.
I advise you to **only** run it against your own [tile server](https://switch2osm.org/serving-tiles/) and not a public one.

## Prerequisites

To run this software you must have [node.js](http://nodejs.org) installed.

## Installation

Use these commands to install this software.

```sh
git clone https://github.com/hdjarv/osm-tile-downloader.git
cd osm-tile-downloader/
npm install
```

## Using

Run this software with command:

```sh
./osm-tile-downloader.js <options>
```

The available options are:

| Name                   | Short name | Required | Description                                                                        |
|------------------------|------------|----------|------------------------------------------------------------------------------------|
| --start-zoom-level <n> | -s         | **Yes**  | Starting zoom level, must be between 0 and 19.                                     |
| --end-zoom-level <n>   | -e         | **Yes**  | Ending zoom level, must be between 0 and 19 and not lower than start zoom level.   |
| --url <url>            | -u         | **Yes**  | Tile server URL, see more below.                                                   |
| --output-dir <dir>     | -o         | **Yes**  | Output directory for downloaded tiles, must be an existing directory.              |
| --verbose              | -v         | *No*     | Verbose mode, default is off.                                                      |
| --check-tiles          | -c         | *No*     | Check if the expected tiles exist in output directory instead of downloading them. |
| --delay <ms>           | -d         | *No*     | Delay in ms between downloads, default is 0.                                       |
| --max-retries <num>    | -m         | *No*     | Maximum number of retries for download, default is 3.                              |
| --retry-delay <ms>     | -r         | *No*     | Delay in ms between download retries, default is 2500.                             |
| --force-overwrite      | -f         | *No*     | Force overwriting existing tiles (re-downloads all tiles), default is off.         |
| --yes                  | -y         | *No*     | Answer yes to prompt confirming downloading of tiles, default is off.              |
| --help                 | -h         | *No*     | Output usage information.                                                          |
| --version              | -V         | *No*     | output the version number.                                                         |


### Tile server URL requirements

The tile server URL to use must be a complete (`http` or `https`) URL with placeholders `{z}`, `{x}`, `{y}` for zoom level, x- & y-tiles.
For example: `http://mytileserver.example.com/osm_tiles/{z}/{x}/{y}.png`
