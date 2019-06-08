"use strict";
const fs = require('fs-extra');
const walkSync = require('walk-sync');
const path = require('path');
class FSMerge {
  constructor(paths) {
    this._dirList = Array.isArray(paths) ? paths : [paths];
  }

  readFileSync(filePath, options) {
    let { _dirList } = this;
    let result = null;
    for (let i=0; i < _dirList.length; i++) {
      let basePath = '';
      if (typeof _dirList[i] == 'string') {
        basePath = _dirList[i];
      } else {
        basePath = _dirList[i].root;
      }
      let fullPath = basePath + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = fs.readFileSync(fullPath, options);
      }
    }
    return result;
  }

  readFileMeta(filePath, options) {
    let { _dirList } = this;
    let result = null;
    let { basePath } = options;
    for (let i=0; i < _dirList.length; i++) {
      let root = _dirList[i].root ? _dirList[i].root : _dirList[i];
      if (basePath == root) {
        return {
          path: root + '/' + filePath,
          prefix: _dirList[i].prefix || ''
        }
      }
      let fullPath = root + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        result = {
          path: fullPath,
          prefix: _dirList[i].prefix || ''
        };
      }
    }
    return result;
  }

  readDirSync(dirPath, options) {
    let { _dirList } = this;
    let result = [];
    for (let i=0; i < _dirList.length; i++) {
      let basePath = '';
      if (typeof _dirList[i] == 'string') {
        basePath = _dirList[i];
      } else {
        basePath = _dirList[i].root;
      }
      let fullDirPath = basePath + '/' + dirPath;
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
      let basePath = '';
      let prefix = '';
      if (typeof _dirList[i] == 'string') {
        basePath = _dirList[i];
      } else {
        basePath = _dirList[i].root;
        prefix = _dirList[i].prefix;
      }
      let fullDirPath = dirPath ? basePath + '/' + dirPath : basePath;
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