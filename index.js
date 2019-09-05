"use strict";
const fs = require('fs-extra');
const walkSync = require('walk-sync');
const path = require('path');

function getRootAndPrefix(tree) {
  let root = '';
  let prefix = '';
  let getDestinationPath = undefined;
  if (typeof tree == 'string') {
    root = tree;
  } else if (tree.hasOwnProperty('_watched') && tree._directoryPath) {
    root = tree.root || tree._directoryPath;
  } else {
    root = tree.root || tree.outputPath;
  }
  return {
    root: path.normalize(root),
    prefix: tree.prefix || prefix,
    getDestinationPath: tree.getDestinationPath || getDestinationPath
  }
}

function getValues(object) {
  if (Object.values) {
    return Object.values(object);
  } else {
    return Object.keys(object).map(function(key) {
      return object[key];
    });
  }
}

class FSMerge {
  constructor(trees) {
    this._dirList = Array.isArray(trees) ? trees : [trees];
    this.MAP = this._dirList.reduce(function(map, tree) {
      let parsedTree = getRootAndPrefix(tree);
      map[parsedTree.root] = parsedTree;
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
    basePath = basePath && path.normalize(basePath);
    if (this.MAP[basePath]) {
      let { root, prefix, getDestinationPath } = this.MAP[basePath];
      return {
        path: path.join(root, filePath),
        prefix: prefix,
        getDestinationPath: getDestinationPath
      }
    }
    for (let i=0; i < _dirList.length; i++) {
      let { root, prefix, getDestinationPath } = getRootAndPrefix(_dirList[i]);
      if (basePath == root) {
        return {
          path: path.join(root, filePath),
          prefix: prefix,
          getDestinationPath: getDestinationPath
        }
      }
      let fullPath = path.join(root, filePath);
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
      let { root, prefix, getDestinationPath } = getRootAndPrefix(_dirList[i]);
      if (!root) {
        throw new Error('FSMerger must be instatiated with string or BroccoliNode or Object with root');
      }
      let fullDirPath = dirPath ? root + '/' + dirPath : root;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        let curEntryList = walkSync.entries(fullDirPath, options);
        hashStore = curEntryList.reduce((hashStoreAccumulated, entry) => {
          let relativePath = getDestinationPath ? getDestinationPath(entry.relativePath) : entry.relativePath;
          relativePath = prefix ? path.join(relativePath, prefix) : relativePath;
          hashStoreAccumulated[relativePath] = entry;
          return hashStoreAccumulated;
        }, hashStore);
      }
    }
    result = getValues(hashStore);
    result.sort((entryA, entryB) => (entryA.relativePath > entryB.relativePath) ? 1 : -1);
    return result;
  }
}

module.exports = FSMerge;