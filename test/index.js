/**
 * Created by Ellery1 on 2016/10/6.
 */
'use strict';
const fs = require('fs');
const testCode = fs.readFileSync('./evalTestCode.js', 'utf8');
const jsEval = require('../index');

const ret = jsEval(testCode);
fs.writeFileSync('./env.json', JSON.stringify(ret.env, null, 4));
fs.writeFileSync('./parseTree.json', JSON.stringify(ret.parseTree, null, 4));