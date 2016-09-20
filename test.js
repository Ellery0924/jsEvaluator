'use strict';
const fs = require('fs'),
    scan = require('./jsTokenizer');

scan(fs.readFileSync('./testProgram.js', 'utf8'));