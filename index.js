"use strict";
const fs = require('fs-extra');
const walkSync = require('walk-sync');
const path = require('path');
const nodefs = require('fs');
const WHITELISTEDOPERATION = new Set([
  'readFileSync',
  'existsSync',
  'lstatSync',
  'statSync',
  'readdirSync',
  'readDir',
  'readFileMeta',
  'entries'
]);

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

function handleOperation({ target, propertyName }, relativePath, ...fsArguments) {
  if (!path.isAbsolute(relativePath)) {
    // if property is present in the FSMerge do not hijack it with fs operations
    if (this[propertyName]) {
      return this[propertyName](relativePath, ...fsArguments);
    }
    let { _dirList } = this;
    let fullPath = relativePath;
    for (let i=0; i < _dirList.length; i++) {
      let { root } = getRootAndPrefix(_dirList[i]);
      let tempPath = root + '/' + relativePath;
      if(fs.existsSync(tempPath)) {
        fullPath = tempPath;
      }
    }
    return target[propertyName](fullPath, ...fsArguments);
  } else {
    throw new Error(`Relative path is expected, path ${relativePath} is an absolute path. inputPath gets prefixed to the reltivePath provided.`);
  }
}

class FSMerge {
  constructor(trees) {
    this._dirList = Array.isArray(trees) ? trees : [trees];
    this.MAP = {};
    this._atList = [];
    let self = this;
    this.fs = new Proxy(nodefs, {
      get(target, propertyName) {
        if(WHITELISTEDOPERATION.has(propertyName) || self[propertyName]) {
          return handleOperation.bind(self, {target, propertyName})
        } else {
          throw new Error(`Operation ${propertyName} is not allowed with FSMerger.fs. Allowed operations are ${Array.from(WHITELISTEDOPERATION).toString()}`);
        }
      }
    });
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

  at(index) {
    if(!this._atList[index]) {
      this._atList[index] = new FSMerge(this._dirList[index]);
    }
    return this._atList[index]
  }

  _generateMap() {
    this.MAP = this._dirList.reduce(function(map, tree) {
      let parsedTree = getRootAndPrefix(tree);
      map[parsedTree.root] = parsedTree;
      return map;
    }, {});
  }

  readFileMeta(filePath, options) {
    if (!this.MAP) {
      this._generateMap();
    }
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

  readdirSync(dirPath, options) {
    let { _dirList } = this;
    let result = [], errorCount = 0;
    let fullDirPath = '';
    for (let i=0; i < _dirList.length; i++) {
      let { root } = getRootAndPrefix(_dirList[i]);
      fullDirPath = root + '/' + dirPath;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        result.push.apply(result, fs.readdirSync(fullDirPath, options));
      } else {
        errorCount += 1;
      }
    }
    if (errorCount == _dirList.length) {
      fs.readdirSync(fullDirPath);
    }
    return [...new Set(result)];
  }

  readdir(dirPath, callback) {
    let result = [];
    let { _dirList } = this;
    let fullDirPath = '';
    let existingPath = [];
    for (let i=0; i < _dirList.length; i++) {
      let { root } = getRootAndPrefix(_dirList[i]);
      fullDirPath = root + '/' + dirPath;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        existingPath.push(fullDirPath);
      }
    }
    if (!existingPath.length) {
      fs.readdir(fullDirPath, callback);
    }
    let readComplete = 0;
    for (let i = 0; i < existingPath.length; i++) {
      fs.readdir(existingPath[i], (err, list) => {
        readComplete += 1;
        result.push.apply(result, list);
        if (readComplete == existingPath.length || err) {
          if (err) {
            result = undefined;
          } else {
            result = [...new Set(result)];
          }
          callback(err, result);
        }
      });
    }
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
          relativePath = prefix ? path.join(prefix, relativePath) : relativePath;
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