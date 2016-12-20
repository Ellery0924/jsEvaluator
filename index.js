/**
 * Created by chenjiao on 2016/12/21.
 */
const tokenize = require('./src/jsTokenizer');
const parse = require('./src/jsParse');
const jsEval = require('./src/jsEval');

module.exports = (code) => jsEval(parse(tokenize(code)));