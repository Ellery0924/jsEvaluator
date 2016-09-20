'use strict';
const fs = require('fs'),
    tokenizer = require('./jsTokenizer');

tokenizer(fs.readFileSync('./testProgram.js', 'utf8'));