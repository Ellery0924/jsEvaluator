/**
 * 词法分析器
 * 只包含es5语法和常用操作符,~ << >>之类的就算了
 */
'use strict';
const rnum = /\d+(\.\d+)?/,
    rbool = /true|false/,
    rstring = /(['"])([^'"]|\\\'|\\\")*\1/,
    rkeyword = /if|while|for|var|else|function|null|undefined|return/,
    rid = /[a-zA-Z$_]([\w$_]+)?/,
    rpunctuation = /\.|,|;|\(|\)|\{|\}|\[|\]|:/,
    roperator = /\+\+|\-\-|\+=|\-=|\*=|\/=|\+|\-|\*|\/|<=|>=|>|<|===|!==|!+|&&|\|\|/,
    rassign = /=/,
    rspace = /[\s\n\r]/,
    rquotation = /['"]/;

let lastIndex = 0, parsed = [];
let lookahead = lastIndex + 1;

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

module.exports = function tokenizer(testCode) {
    const codeLen = testCode.length;
    //使用lastIndex和lookahead维护一个缓冲区
    //缓冲区的初始大小为1,即只保存一个字符
    //但是会有很多情况需要追加字符再进行匹配
    while (lastIndex < codeLen && lookahead < codeLen) {
        while (lookahead <= codeLen) {
            const currentCode = testCode.slice(lastIndex, lookahead);
            const nextLetter = testCode[lookahead],
                currentFirstLetter = currentCode[0],
                currentLastLetter = currentCode[currentCode.length - 1];

            //直接全部尝试一次似乎性能有些挫?先不管了...
            const mnum = currentCode.match(rnum),
                mbool = currentCode.match(rbool),
                mstring = currentCode.match(rstring),
                mkeyword = currentCode.match(rkeyword),
                mid = currentCode.match(rid),
                mpunctuation = currentCode.match(rpunctuation),
                moperator = currentCode.match(roperator),
                massign = currentCode.match(rassign),
                mspace = currentCode.match(rspace);

            //如果是空格或者换行,直接跳到下一个字符
            if (mspace) {
                lastIndex++;
                lookahead++;
                break;
            }

            //优先处理字符串匹配,因为字符串和标识符的匹配是冲突的
            //读到'或者"时,不断地向缓冲区加入新字符直至匹配到结尾的'或者"
            //如果结尾和开头不同为'或者",则报语法错误
            if (currentFirstLetter.match(rquotation)) {
                if (currentCode.length === 1
                    || currentCode.length > 1 && !currentLastLetter.match(/['"]/
                    || currentLastLetter.match(/['"]/) && currentCode[currentCode.length - 2] === '\\')) {
                    lookahead++;
                    break;
                }
                else if (currentLastLetter !== currentFirstLetter) {
                    throw new Error('syntax error: fail to match quotation at:' + currentCode);
                }
            }

            //匹配布尔值
            if (mbool) {
                parsed.push(getToken(mbool, 'bool'));
                break;
            }
            //匹配字符串
            else if (mstring) {
                parsed.push(getToken(mstring, 'string'));
                break;
            }
            //匹配关键字
            //由于字符串的匹配优先进行,因此这里可以放心的匹配
            else if (mkeyword) {
                parsed.push(getToken(mkeyword, 'keyword'));
                break;
            }
            //匹配标识符
            else if (mid) {
                if (nextLetter.match(/[\w\d_$]/)) {
                    lookahead++;
                    break;
                }
                parsed.push(getToken(mid, 'id'));
                break;
            }
            //匹配数字(浮点数和整数)
            else if (mnum) {
                if (nextLetter.match(/[\.\d]/)) {
                    lookahead++;
                    break;
                }
                parsed.push(getToken(mnum, 'num'));
                break;
            }
            //匹配标点符号
            else if (mpunctuation) {
                parsed.push(getToken(mpunctuation, 'punctuation'));
                break;
            }
            //匹配操作符
            else if (moperator) {
                const currentLetter = moperator[0];
                //以下操作符可能是某个更长的操作符的一部分
                //因此遇到以下操作符直接向缓冲区追加一个字符进行匹配
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
                //处理!,!可能是!!(!!!,!!!!...)或者!==的一部分
                if (currentLetter === '!') {
                    //不停地追加!直至下一个不是!的字符
                    if (nextLetter === '!') {
                        lookahead++;
                        break;
                    }
                    //匹配!==
                    if (nextLetter === '=') {
                        lookahead++;
                        break;
                    }
                }
                parsed.push(getToken(moperator, 'operator'));
                break;
            }
            //匹配赋值(=)
            else if (massign) {
                //=可能是===的一部分,因此直接追加一个字符
                if (nextLetter === '=') {
                    lookahead++;
                    break;
                }
                parsed.push(getToken(massign, 'assign'));
                break;
            }

            //出现空匹配,报语法错误
            throw new Error('syntax error at:' + currentCode);
        }
    }

    return parsed;
};