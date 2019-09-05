## Introduction
This library helps to mask the underlying folder structure and simluates that all the files are stored under a single folder.
For example:
```js
/* test-1
    |
    -- a.txt
    -- b.txt

    test-2
    |
    -- c.txt
    -- d.txt
    -- sub-dir
        |
        -- x.txt
        -- y.txt

    test-3
    |
    -- e.txt
    -- a.txt
 */
```

For the consumer of the library it will look like all the folders are merged from left to right and now under same folder.

```js
/*
-- b.txt
-- c.txt
-- c.txt
-- d.txt
-- sub-dir
    |
    -- x.txt
    -- y.txt
-- e.txt
-- a.txt (since we are mergeing from left to right a.txt from test-1 gets overwritten by a.txt of test-3)
*/
```

This library simulates the behaviour of the [broccoli-merge-trees](https://github.com/broccolijs/broccoli-merge-trees)

## Usage
Constructor can take inputs of the type `string`, `BroccoliNode` or FSMerger expected format of Object explained [here](#fsmerger-special-Object)

```js
let FSMerge = require('fs-merger');
let fs = new FSMerge(['test-1', 'test-2', 'test-3']);
/* test-1
    |
    -- a.txt
    -- b.txt

    test-2
    |
    -- c.txt
    -- d.txt
    -- sub-dir
        |
        -- x.txt
        -- y.txt

    test-3
    |
    -- e.txt
    -- a.txt
 */
 let contentB = fs.readFileSync('b.txt'); // content of test-1/b.txt
 let contentSubDir = fs.readFileSync('sub-dir/x.txt'); //content of test-2/sub-dir/x.txt
 let contentA = fs.readFileSync('a.txt'); // content of test-3/a.txt; here we merge left to right, duplicate files are overwritten
 ```

## FSMerger Special Object
This kind of input is supported only to help broccoli-persistent-filter to reduce the number of merges and funnels needed to be performed before it is passed down to
persistent filter's constructor is called.

This library will help in avoding unneccesary merge required before calling broccoli-persistent-filter plugin.

For example:
```js
// filter.js
const Filter = require('broccoli-persistent-filter');
class TestFilter extends Filter {
    constructor(nodes) {
      super(nodes);
    }

    processString(content) {
        return content.replace(/broccoli/gi, `filter`);
    }
};
```
```js
/* input structure
fixture
    |
    -- docs
        |
        -- c.txt
        -- d.txt
    -- example
        |
        -- map.js
*/
```

```js
// BrocFile.js
const Funnel =  require('broccoli-funnel');
const MergeTree = require('broccoli-merge-trees');
let mergedTree = new MergeTree([
  new Funnel('fixture/docs', {
    destDir: 'documents'
  }),
  new Funnel('fixture/example', {
    getDestinationPath: function (relativePath) {
      if (relativePath.includes('map.js')) {
        return 'metal.js';
      }
      return relativePath;
    }
  }),
]);
module.exports = new TestFilter(mergedTree);
```

```sh
broccoli build dist
# output
# dist
#   |
#   --documents
#       |
#       -- c.txt
#       -- d.txt
#   --example
#       |
#       -- metal.js
```
With this new library we can write the same above as following once [PR](https://github.com/stefanpenner/broccoli-persistent-filter/pull/175) is merged into `broccoli-persistent-filter`.

```js

let FSMergerObjectWithPrefix = {
    root: 'fixture/docs',
    prefix: 'documents'
}

let FSMergerObjectWithFileDest = {
    root: 'fixture/example',
    getFileDestiation:  function (relativePath) {
      if (relativePath.includes('map.js')) {
        return 'metal.js';
      }
      return relativePath;
    }
}

module.exports = new TestFilter([FSMergerObjectWithPrefix, FSMergerObjectWithFileDest]);

```

This new library helped in removing two funnels which where used only for the sake of renaming at the output of persitent filter and mergeTree was performed because persitent filter was restricted to accept only one inputNode.
