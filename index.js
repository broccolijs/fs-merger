"use strict";
const fs = require('fs-extra');
const walkSync = require('walk-sync');
const path = require('path');

function getRootAndPrefix(item) {
  let root = '';
  let prefix = '';
  if (typeof item == 'string') {
    root = item;
  } else {
    root = item.root || item.outputPath;
    prefix = item.prefix || '';
  }
  return {
    root: root,
    prefix: prefix
  }
}
class FSMerge {
  constructor(paths) {
    this._dirList = Array.isArray(paths) ? paths : [paths];
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
    for (let i=0; i < _dirList.length; i++) {
      let { root, prefix } = getRootAndPrefix(_dirList[i]);
      if (basePath == root) {
        return {
          path: root + '/' + filePath,
          prefix: prefix
        }
      }
      let fullPath = root + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = {
          path: fullPath,
          prefix: prefix
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