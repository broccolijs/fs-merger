"use strict";
const fs = require('fs-extra');
const walkSync = require('walk-sync');

class FSMerge {
  constructor(paths) {
    this._dirList = Array.isArray(paths) ? paths : [paths];
  }

  readFileSync(filePath, options) {
    let { _dirList } = this;
    let result = null;
    for (let i=0; i < _dirList.length; i++) {
      let fullPath = _dirList[i] + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = fs.readFileSync(fullPath, options);
      }
    }
    return result;
  }

  readFilePath(filePath, options) {
    let { _dirList } = this;
    let result = null;
    for (let i=0; i < _dirList.length; i++) {
      let fullPath = _dirList[i] + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = fullPath;
      }
    }
    return result;
  }
  readDirSync(dirPath, options) {
    let { _dirList } = this;
    let result = [];
    for (let i=0; i < _dirList.length; i++) {
      let fullDirPath = _dirList[i] + '/' + dirPath;
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
    for (let i=0; i < _dirList.length; i++) {
      let fullDirPath = dirPath ? _dirList[i] + '/' + dirPath : _dirList[i];
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        let curEntryList = walkSync.entries(fullDirPath, options);
        result.push.apply(result, curEntryList);
      }
    }
    result.sort((entryA, entryB) => (entryA.relativePath > entryB.relativePath) ? 1 : -1);
    let hashStore = result.reduce((hashStoreAccumulated, entry) => {
      hashStoreAccumulated[entry.relativePath] = entry;
      return hashStoreAccumulated;
    }, {});

    return Object.values(hashStore);
  }
}

module.exports = FSMerge;