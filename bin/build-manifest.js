var fs = require('fs');
var path = require('path');
var pack = require('../package.json');

var manifest = fs.readFileSync(
  path.resolve(__dirname, '../src/manifest.json')
);

manifest = JSON.parse(manifest);
manifest.version = pack.version;

fs.writeFileSync(
  path.resolve(__dirname, '../dist/manifest.json'),
  JSON.stringify(manifest, null, 0)
);
