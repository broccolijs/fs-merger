"use strict";
const fs = require('fs-extra');
const walkSync = require('walk-sync');
const path = require('path');

function getRootAndPrefix(item) {
  let root = '';
  let prefix = '';
  let getDestinationPath = '';
  if (typeof item == 'string') {
    root = item;
  } else {
    root = item.root || item.outputPath;
    prefix = item.prefix || '';
    getDestinationPath = item.getDestinationPath
  }
  return {
    root: root,
    prefix: prefix,
    getDestinationPath: getDestinationPath
  }
}
class FSMerge {
  constructor(paths) {
    this._dirList = Array.isArray(paths) ? paths : [paths];
    this.MAP = this._dirList.reduce(function(map, obj) {
      let { root } = getRootAndPrefix(obj);
      map[root] = obj;
      return map;
    }, {});
  }

  readFileSync(filePath, options) {
    let { _dirList } = this;
    let result = null;
    for (let i=0; i < _dirList.length; i++) {
      let { root } = getRootAndPrefix(_dirList[i]);
      let fullPath = root + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = fs.readFileSync(fullPath, options);
      }
    }
    return result;
  }

  readFileMeta(filePath, options) {
    let { _dirList } = this;
    let result = null;
    let { basePath } = options || {};
    if (this.MAP[basePath]) {
      let { root, prefix, getDestinationPath } = this.MAP[basePath];
      return {
        path: root + '/' + filePath,
        prefix: prefix,
        getDestinationPath: getDestinationPath
      }
    }
    for (let i=0; i < _dirList.length; i++) {
      let { root, prefix, getDestinationPath } = getRootAndPrefix(_dirList[i]);
      if (basePath == root) {
        return {
          path: root + '/' + filePath,
          prefix: prefix,
          getDestinationPath: getDestinationPath
        }
      }
      let fullPath = root + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = {
          path: fullPath,
          prefix: prefix,
          getDestinationPath: getDestinationPath
        };
      }
    }
    return result;
  }

  readDirSync(dirPath, options) {
    let { _dirList } = this;
    let result = [];
    for (let i=0; i < _dirList.length; i++) {
      let { root } = getRootAndPrefix(_dirList[i]);
      let fullDirPath = root + '/' + dirPath;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        result.push.apply(result, fs.readdirSync(fullDirPath, options));
      }
    }
    return [...new Set(result)];
  }

  entries(dirPath = '', options) {
    let { _dirList } = this;
    let result = [];
    let hashStore = {};
    for (let i=0; i < _dirList.length; i++) {
      let { root, prefix } = getRootAndPrefix(_dirList[i]);
      if (!root) {
        throw new Error('FSReader must be instatiated with string or object');
      }
      let fullDirPath = dirPath ? root + '/' + dirPath : root;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        let curEntryList = walkSync.entries(fullDirPath, options);
        hashStore = curEntryList.reduce((hashStoreAccumulated, entry) => {
          hashStoreAccumulated[path.join(entry.relativePath, prefix)] = entry;
          return hashStoreAccumulated;
        }, hashStore);
      }
    }
    result = Object.values(hashStore);
    result.sort((entryA, entryB) => (entryA.relativePath > entryB.relativePath) ? 1 : -1);
    return result;
  }
}

module.exports = FSMerge;