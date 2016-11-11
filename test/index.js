/**
 * Created by Ellery1 on 2016/10/6.
 */
'use strict';
const fs = require('fs');
const testCode = fs.readFileSync('./evalTestCode.js', 'utf8');
const parse = require('../jsEval/jsParse');
const tokenizer = require('../jsEval/jsTokenizer');
const evaluator = require('../jsEval/jsEval');

console.log('evaluating javascript expression ' + testCode);
const ret = evaluator(parse(tokenizer(testCode)));
fs.writeFileSync('./env.json', JSON.stringify(ret.env, null, 4));
fs.writeFileSync('./evalret.json', JSON.stringify(ret.ast, null, 4));