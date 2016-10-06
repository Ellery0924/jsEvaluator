/**
 * Created by Ellery1 on 2016/10/6.
 */
'use strict';
const fs = require('fs');
const testCode = fs.readFileSync('./evalTestCode','utf8');
const jsEval = require('./jsEval');
const tokenizer = require('./jsTokenizer');

jsEval(tokenizer((testCode)));