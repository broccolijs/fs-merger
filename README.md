##Usage
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
    
    test-3
    |
    -- e.txt
    -- a.txt
 */
 let content = fs.readFileSync('b.txt); //content of test-1/b.txt
 let contentA = fs.readFileSync('a.txt') // content of test-3/a.txt; here we merge left to right, duplicate files are overwritten
 ```
 
