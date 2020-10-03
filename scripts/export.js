const fs = require('fs');
const path = require('path');

/* eslint-disable-next-line import/no-extraneous-dependencies */
const mkdirp = require('mkdirp');

const BUILD_DIR = path.resolve(__dirname, '../build/contracts');
const ABI_DIR = path.resolve(__dirname, '../build/abi');
const JSON_EXT = '.json';

mkdirp.sync(ABI_DIR);

const fileList = fs.readdirSync(BUILD_DIR);

fileList.forEach((filename) => {
  if (filename.endsWith(JSON_EXT)) {
    const data = fs.readFileSync(path.join(BUILD_DIR, filename));
    const jsonData = JSON.parse(data);
    const { abi } = jsonData;
    if (abi) {
      fs.writeFileSync(path.join(ABI_DIR, path.basename(filename)), JSON.stringify(abi, null, 2));
    }
  }
});
