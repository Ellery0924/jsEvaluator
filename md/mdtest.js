/**
 * Created by Ellery1 on 16/9/23.
 */
'use strict'
const mdparser = require('./markdownParser');
const fs = require('fs');

fs.writeFileSync('./result.html', mdparser(fs.readFileSync('./test.md', 'utf8')));

