/**
 * 词法分析器
 * 只包含es5语法和常用操作符,~ << >>之类的就算了
 */
'use strict';
const rnum = /\d+(\.\d+)?/,
    rbool = /true|false/,
    rstring = /(['"])([^'"]|\\\'|\\\")*\1/,
    rkeyword = /if|while|for|var|else|function|null|undefined/,
    rid = /[a-zA-Z$_]([\w$_]+)?/,
    rpunctuation = /\.|,|;|\(|\)|\{|\}|\[|\]/,
    roperator = /\+\+|\-\-|\+=|\-=|\*=|\/=|\+|\-|\*|\/|<=|>=|>|<|===|!==|!+|&&|\|\|/,
    rassign = /=/,
    rspace = /[\s\n\r]/,
    rquotation = /['"]/;

let lastIndex = 0, parsed = [];
let lookahead = lastIndex + 1;

module.exports = function scan(testCode) {

    const codeLen = testCode.length;

    function getToken(match, type) {
        const cachedIndex = lastIndex,
            token = match[0];
        lastIndex += token.length;
        lookahead = lastIndex + 1;
        console.log({
            token: token,
            len: token.length,
            type: type,
            pos: cachedIndex
        });
        return {
            token: token,
            len: token.length,
            type: type,
            pos: cachedIndex
        };
    }

    while (lastIndex < codeLen && lookahead < codeLen) {

        while (lookahead <= codeLen) {
            const currentCode = testCode.slice(lastIndex, lookahead);
            const nextLetter = testCode[lookahead],
                currentFirstLetter = currentCode[0],
                currentLastLetter = currentCode[currentCode.length - 1];

            const mnum = currentCode.match(rnum),
                mbool = currentCode.match(rbool),
                mstring = currentCode.match(rstring),
                mkeyword = currentCode.match(rkeyword),
                mid = currentCode.match(rid),
                mpunctuation = currentCode.match(rpunctuation),
                moperator = currentCode.match(roperator),
                massign = currentCode.match(rassign),
                mspace = currentCode.match(rspace);

            if (mspace) {
                lastIndex++;
                lookahead++;
                break;
            }

            if (currentFirstLetter.match(rquotation)) {
                if (currentCode.length === 1
                    || currentCode.length > 1 && !currentLastLetter.match(/['"]/)) {
                    lookahead++;
                    break;
                }
                else if (currentLastLetter !== currentFirstLetter) {
                    throw new Error('syntax error: fail to match quotation at:' + currentCode);
                }
            }

            if (mbool) {
                parsed.push(getToken(mbool, 'bool'));
                break;
            }
            else if (mstring) {
                parsed.push(getToken(mstring, 'string'));
                break;
            }
            else if (mkeyword) {
                parsed.push(getToken(mkeyword, 'keyword'));
                break;
            }
            else if (mid) {
                if (nextLetter.match(/[\w\d_$]/)) {
                    lookahead++;
                    break;
                }
                parsed.push(getToken(mid, 'id'));
                break;
            }
            else if (mnum) {
                if (nextLetter.match(/[\.\d]/)) {
                    lookahead++;
                    break;
                }
                parsed.push(getToken(mnum, 'num'));
                break;
            }
            else if (mpunctuation) {
                parsed.push(getToken(mpunctuation, 'punctuation'));
                break;
            }
            else if (moperator) {
                const currentLetter = moperator[0];
                if (currentLetter === '<'
                    || currentLetter === '>'
                    || currentLetter === '+'
                    || currentLetter === '-'
                    || currentLetter === '*'
                    || currentLetter === '/') {
                    if (nextLetter === '=') {
                        lookahead++;
                        break;
                    }
                    if (currentLetter === '+' || currentLetter === '-') {
                        lookahead++;
                        break;
                    }
                }
                if (currentLetter === '!') {
                    if (nextLetter.match('!')) {
                        lookahead++;
                        break;
                    }
                    if (nextLetter.match('=')) {
                        lookahead++;
                        break;
                    }
                }
                parsed.push(getToken(moperator, 'operator'));
                break;
            }
            else if (massign) {
                if (nextLetter.match(/=/)) {
                    lookahead++;
                    break;
                }
                parsed.push(getToken(massign, 'assign'));
                break;
            }

            throw new Error('syntax error at:' + currentCode);
        }
    }

    return parsed;
};