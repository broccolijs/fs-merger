"use strict";

const fs = require('fs-extra');
const path = require('path');
const nodefs = require('fs');
const broccoliNodeInfo = require('broccoli-node-info');
import {
  FSMergerObject,
  Node,
  FileMeta,
  FileMetaOption,
  FileContent,
  FSMergerFileOperations
} from './interface';
import { entries, Options, Entry } from 'walk-sync';

const WHITELISTEDOPERATION = new Set([
  'readFileSync',
  'existsSync',
  'lstatSync',
  'statSync',
  'readdirSync',
  'readdir',
  'readFileMeta',
  'entries'
]);

function getRootAndPrefix(node: any): FSMergerObject {
  let root = '';
  let prefix = '';
  let getDestinationPath = undefined;
  if (typeof node == 'string') {
    root = node;
  } else if(node.root) {
    root = node.root;
  } else {
    let { nodeType, sourceDirectory } = broccoliNodeInfo.getNodeInfo(node);
    root = nodeType == 'source' ? sourceDirectory : node.outputPath;
  }
  return {
    root: path.normalize(root),
    prefix: node.prefix || prefix,
    getDestinationPath: node.getDestinationPath || getDestinationPath
  }
}

function getValues(object: {[key:string]: any}) {
  if (Object.values) {
    return Object.values(object);
  } else {
    return Object.keys(object).map(function(key) {
      return object[key];
    });
  }
}

function handleOperation(this: FSMerge & {[key: string]: any}, { target, propertyName }: {
    target: {[key: string]: any};
    propertyName: string;
  }, relativePath: string, ...fsArguments: any[]) {
  if (!this.MAP) {
    this._generateMap();
  }
  if (!path.isAbsolute(relativePath)) {
    // if property is present in the FSMerge do not hijack it with fs operations
    if (this[propertyName]) {
      return this[propertyName](relativePath, ...fsArguments);
    }
    let { _dirList } = this;
    let fullPath = relativePath;
    for (let i=_dirList.length-1; i > -1; i--) {
      let { root } = this.PREFIXINDEXMAP[i];
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
  _dirList: Node[];
  MAP: { [key: string]: FSMergerObject } | null;
  PREFIXINDEXMAP: { [key: number]: FSMergerObject };
  _atList: FSMerge[];
  fs: FSMergerFileOperations

  constructor(trees: Node[] | Node) {
    this._dirList = Array.isArray(trees) ? trees : [trees];
    this.MAP = null;
    this.PREFIXINDEXMAP = {};
    this._atList = [];
    let self: FSMerge & {[key: string]: any} = this;
    this.fs = new Proxy(nodefs, {
      get(target, propertyName: string) {
        if(WHITELISTEDOPERATION.has(propertyName) || self[propertyName]) {
          return handleOperation.bind(self, {target, propertyName})
        } else {
          throw new Error(`Operation ${propertyName} is not allowed with FSMerger.fs. Allowed operations are ${Array.from(WHITELISTEDOPERATION).toString()}`);
        }
      }
    });
  }

  readFileSync(filePath:string, options?: { encoding?: string | null; flag?: string; } | string | null): FileContent | undefined {
    if (!this.MAP) {
      this._generateMap();
    }
    let { _dirList } = this;
    for (let i=_dirList.length-1; i > -1; i--) {
      let { root } = this.PREFIXINDEXMAP[i];
      let fullPath = root + '/' + filePath;
      if(fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, options);
      }
    }
  }

  at(index: number): FSMerge {
    if(!this._atList[index]) {
      this._atList[index] = new FSMerge(this._dirList[index]);
    }
    return this._atList[index]
  }

  _generateMap(): void {
    this.MAP = this._dirList.reduce((map:{ [key: string]: FSMergerObject }, tree: Node, index: number) => {
      let parsedTree: FSMergerObject = getRootAndPrefix(tree);
      map[parsedTree.root] = parsedTree;
      this.PREFIXINDEXMAP[index] = parsedTree;
      return map;
    }, {});
  }

  readFileMeta (filePath: string, options: FileMetaOption): FileMeta | undefined {
    if (!this.MAP) {
      this._generateMap();
    }
    let { _dirList } = this;
    let { basePath = '' } = options || {};
    basePath = basePath && path.normalize(basePath);
    if (this.MAP && this.MAP[basePath]) {
      let { root, prefix, getDestinationPath } = this.MAP[basePath];
      return {
        path: path.join(root, filePath),
        prefix: prefix,
        getDestinationPath: getDestinationPath
      }
    }
    for (let i=_dirList.length-1; i > -1; i--) {
      let { root, prefix, getDestinationPath } = this.PREFIXINDEXMAP[i];
      let fullPath = path.join(root, filePath);
      if (basePath == root || fs.existsSync(fullPath)) {
        return {
          path: fullPath,
          prefix: prefix,
          getDestinationPath: getDestinationPath
        };
      }
    }
  }

  readdirSync(dirPath: string, options?: { encoding?: string | null; withFileTypes?: false } | string | null): string[] | Buffer[] {
    if (!this.MAP) {
      this._generateMap();
    }
    let { _dirList } = this;
    let result: string[] = [], errorCount = 0;
    let fullDirPath = '';
    for (let i=0; i < _dirList.length; i++) {
      let { root } = this.PREFIXINDEXMAP[i];
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

  readdir(dirPath: string,
    options: { encoding?: string | null; withFileTypes?: false } | string | undefined | null,
    callback: (err: NodeJS.ErrnoException | null, files: string[] | Buffer[]) => void): void
  {
    if (!this.MAP) {
      this._generateMap();
    }

    if (typeof options === 'function') {
      callback = options;
      options = 'utf-8';
    }
    let result: string[] = [];
    let { _dirList } = this;
    let fullDirPath = '';
    let existingPath = [];
    for (let i=0; i < _dirList.length; i++) {
      let { root } = this.PREFIXINDEXMAP[i];
      fullDirPath = root + '/' + dirPath;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        existingPath.push(fullDirPath);
      }
    }
    if (!existingPath.length) {
      fs.readdir(fullDirPath, options, callback);
    }
    let readComplete = 0;
    for (let i = 0; i < existingPath.length; i++) {
      fs.readdir(existingPath[i], options, (err: NodeJS.ErrnoException | null , list: string[]) => {
        readComplete += 1;
        result && result.push.apply(result, list);
        if (readComplete == existingPath.length || err) {
          if (err) {
            // @ts-ignore
            result = undefined;
          } else {
            result = [...new Set(result)];
          }
          callback(err, result);
        }
      });
    }
  }

  entries(dirPath: string = '', options: Options): Entry[] {
    if (!this.MAP) {
      this._generateMap();
    }
    let { _dirList } = this;
    let result: Entry[] = [];
    let hashStore = {};
    for (let i=0; i < _dirList.length; i++) {
      let { root, prefix, getDestinationPath } = this.PREFIXINDEXMAP[i];
      if (!root) {
        throw new Error('FSMerger must be instatiated with string or BroccoliNode or Object with root');
      }
      let fullDirPath = dirPath ? root + '/' + dirPath : root;
      fullDirPath = fullDirPath.replace(/(\/|\/\/)$/, '');
      if(fs.existsSync(fullDirPath)) {
        let curEntryList = entries(fullDirPath, options);
        hashStore = curEntryList.reduce((hashStoreAccumulated: {[key: string]: Entry}, entry: Entry) => {
          let relativePath:string = getDestinationPath ? getDestinationPath(entry.relativePath) : entry.relativePath;
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

export default FSMerge;