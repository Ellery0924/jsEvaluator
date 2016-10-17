/**
 * Created by Ellery1 on 2016/10/6.
 */
'use strict';
const fs = require('fs');
const testCode = fs.readFileSync('./evalTestCode.js', 'utf8');
const parse = require('./jsParse');
const tokenizer = require('./jsTokenizer');
const evaluator = require('./jsEval');

console.log('evaluating javascript expression ' + testCode);
const parsed = parse(tokenizer(testCode));
fs.writeFileSync('./evalret.json', JSON.stringify(parse(tokenizer((testCode))), null, 4));
fs.writeFileSync('./env.json', JSON.stringify(evaluator(parsed), null, 4));