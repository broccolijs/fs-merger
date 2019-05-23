"use strict";
const expect = require("chai").expect;
const fs = require('../index');
const fixturify = require('fixturify');
const rm = require('rimraf').sync;

describe('fs-reader', function () {
  before(function() {
    fixturify.writeSync('fixtures', {
      'test-1': {
        'a.txt': 'hello',
        'test-1': {
          'b.txt': 'b contains text'
        }
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
        'b.txt': 'This is file which is same as test-1/test-1/b.txt'
      }
    });
  });
  after(function () {
    rm('fixtures');
  });

  it('Reads file from given location', async function() {
    let content = await fs(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']).readFileSync('a.txt', 'utf-8');
    expect(content).to.be.equal('hello');
    content = await fs(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']).readFileSync('c.txt', 'utf-8');
    expect(content).to.be.equal('this is new file');
    content = await fs(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']).readFileSync('test-1/b.txt', 'utf-8');
    expect(content).to.be.equal('b contains text');
  });
  it('Reads contents of the folder from given location', async function() {
    let content = await fs(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']).readDirSync('test-1');
    expect(content).to.be.deep.equal(['b.txt']);
    content = await fs(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']).readDirSync('test-sub-1');
    expect(content).to.be.deep.equal(['sub-b.txt', 'test-sub-sub-1/', 'test-sub-sub-1/sub-sub-b.txt']);
    content = await fs(['fixtures/test-1', 'fixtures/test-2', 'fixtures/test-3']).readDirSync('test-sub-1/test-sub-sub-1');
    expect(content).to.be.deep.equal(['sub-sub-b.txt']);
  });
});