"use strict";
const fs = require('fs-extra');
const path = require('path');
const walkSync = require('walk-sync');

let _dirList = [];

function readFileSync(filePath, options) {
  for (let i=0; i <= _dirList.length; i++) {
    let fullPath = _dirList[i] + '/' + filePath;
    if(fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, options);
    }
  }
}

function readDirSync(dirPath, options) {
  for (let i=0; i <= _dirList.length; i++) {
    let fullDirPath = _dirList[i] + '/' + dirPath;
    if(fs.existsSync(fullDirPath)) {
      return walkSync(fullDirPath, options);
    }
  }
}

function walk(basePath, relativePath) {
  let result = [];
  let files = fs.readdirSync(basePath);
  files.forEach(function (file) {
    let filePath = basePath + '/' + file;
    let currentRelativePath = relativePath === '/' ? file : path.join(relativePath, file);
    let stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      result.push(file);
      result.push.apply(result, walk(filePath, currentRelativePath));
    } else {
      result.push(currentRelativePath);
    }
  });
  return result;
}

module.exports = function (dirList) {
  _dirList = dirList;
  return {
    readDirSync,
    readFileSync
  }
}

module.exports.readDirSync = readDirSync;
module.exports.readFileSync = readFileSync;