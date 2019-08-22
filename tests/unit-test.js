"use strict";
const expect = require("chai").expect;
const FSMerge = require('../index');
const fixturify = require('fixturify');
const rm = require('rimraf').sync;

describe('fs-reader', function () {
  before(function() {
    fixturify.writeSync('fixtures', {
      'test-1': {
        'a.txt': 'hello',
        'test-1': {
          'b.txt': 'b contains text'
        },
        'x.txt': 'one more file'
      },
      'test-2': {
        'a.txt': 'this is same other',
        'c.txt': 'this is new file',
        'test-sub-1': {
          'sub-b.txt': 'this is inside test-sub-1',
          'test-sub-sub-1': {
            'sub-sub-b.txt': 'this is inside of test-sub-sub-1'
          }
        }
      },
      'test-3': {
        'd.txt': 'this is different file',
        'b.txt': 'This is file which is same as test-1/test-1/b.txt',
        'test-sub-1': {
          'sub-c.txt': 'this is inside test-sub-1',
          'test-sub-sub-1': {
            'sub-sub-c.txt': 'this is inside of test-sub-sub-1'
          }
        }
      }
    });
  });
  after(function () {
    rm('fixtures');
  });

  describe('Reads file from given location', function() {
    let fs = new FSMerge(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']);
    it('a.txt', function () {
      let content = fs.readFileSync('a.txt', 'utf-8');
      expect(content).to.be.equal('this is same other');
    });
    it('c.txt', function () {
      let content = fs.readFileSync('c.txt', 'utf-8');
      expect(content).to.be.equal('this is new file');
    });
    it('test-1/b.txt', function () {
      let content = fs.readFileSync('c.txt', 'utf-8');
      expect(content).to.be.equal('this is new file');
    });
    it('test-1/b.txt', function () {
      let content = fs.readFileSync('test-1/b.txt', 'utf-8');
      expect(content).to.be.equal('b contains text');
    });
    it('test-1/b.txt', function () {
      let content = fs.readFileSync('test-sub-1/test-sub-sub-1/sub-sub-c.txt', 'utf-8');
      expect(content).to.be.equal('this is inside of test-sub-sub-1');
    });
  });
  describe('Reads file meta details', function() {
    let fs = new FSMerge(['fixtures/test-1', {
      root: 'fixtures/test-2',
      prefix: 'test-2',
      getDestinationPath: undefined
    }, {
      outputPath: 'fixtures/test-3'
    }]);
    it('correct meta for string', function () {
      let meta = fs.readFileMeta('x.txt');
      expect(meta).to.eql({
        path: 'fixtures/test-1/x.txt',
        prefix: '',
        getDestinationPath: undefined,
      });
    });
    it('correct meta for provided prefix', function () {
      let meta = fs.readFileMeta('c.txt');
      expect(meta).to.eql({
        path: 'fixtures/test-2/c.txt',
        prefix: 'test-2',
        getDestinationPath: undefined,
      });
    });
    it('correct meta for broccoli node', function () {
      let meta = fs.readFileMeta('d.txt')
      expect(meta).to.eql({
        path: 'fixtures/test-3/d.txt',
        prefix: '',
        getDestinationPath: undefined,
      })
    });
  });
  describe('Reads contents of the folder from location', function() {
    let fs = new FSMerge(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']);
    it('test-1', function() {
      let content = fs.readDirSync('test-1');
      expect(content).to.be.deep.equal(['b.txt']);
    });
    it('test-sub-1', function() {
      let content = fs.readDirSync('test-sub-1');
      expect(content).to.be.deep.equal([ 'sub-b.txt', 'test-sub-sub-1', 'sub-c.txt' ]);
    });
    it('test-sub-1/test-sub-sub-1', function() {
      let content = fs.readDirSync('test-sub-1/test-sub-sub-1');
      expect(content).to.be.deep.equal([ 'sub-sub-b.txt', 'sub-sub-c.txt' ]);
    });
    it('/', function() {
      let content = fs.readDirSync('/');
      expect(content).to.be.deep.equal([ 'a.txt', 'test-1', 'x.txt','c.txt', 'test-sub-1', 'b.txt', 'd.txt']);
    });
  });
  describe('Returns entries for', function() {
    let fs = new FSMerge(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']);
    it('root path', function () {
      let fsEntries = fs.entries();
      let fileList = [];
      let walkList = ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'test-1/', 'test-1/b.txt', 'test-sub-1/', 'test-sub-1/sub-b.txt', 'test-sub-1/sub-c.txt', 'test-sub-1/test-sub-sub-1/', 'test-sub-1/test-sub-sub-1/sub-sub-b.txt', 'test-sub-1/test-sub-sub-1/sub-sub-c.txt', 'x.txt' ];
      fsEntries.forEach(entry => {
        fileList.push(entry.relativePath);
      });
      expect(fileList).to.be.deep.equal(walkList);
    });
    it('test-1', function () {
      let fsEntries = fs.entries('test-1');
      let fileList = [];
      let walkList = [ 'b.txt' ];
      fsEntries.forEach(entry => {
        fileList.push(entry.relativePath);
      });

      expect(fileList).to.be.deep.equal(walkList);
    });
    it('test-sub-1', function() {
      let fsEntries = fs.entries('test-sub-1');
      let fileList = [];
      let walkList = [ 'sub-b.txt', 'sub-c.txt', 'test-sub-sub-1/', 'test-sub-sub-1/sub-sub-b.txt', 'test-sub-sub-1/sub-sub-c.txt' ];
      fsEntries.forEach(entry => {
        fileList.push(entry.relativePath);
      });

      expect(fileList).to.be.deep.equal(walkList);
    });
    it('test-sub-1/test-sub-sub-1', function() {
      let fsEntries = fs.entries('test-sub-1/test-sub-sub-1');
      let fileList = [];
      let walkList = [ 'sub-sub-b.txt', 'sub-sub-c.txt' ];
      fsEntries.forEach(entry => {
        fileList.push(entry.relativePath);
      });

      expect(fileList).to.be.deep.equal(walkList);
    });
  });
});