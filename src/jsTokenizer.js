/**
 * 词法分析器
 * 只包含es5语法和常用操作符,~ << >>之类的就算了
 */
'use strict';
//不处理科学计数法的数字
const rnum = /\-?\d+(\.\d+)?/,
  rbool = /^(true|false)$/,
  rstring = /(['"])((\'|\"|[^'"])*)\1/,
  rkeyword = /^(new|if|while|for|var|else|function|null|undefined|return|do|break|continue|typeof|delete|void|instanceof|in|debugger|default|case|try|catch|finally|throw)$/,
  rid = /[a-zA-Z$_]([\w$_]+)?/,
  rpunctuation = /\.|,|;|\(|\)|\{|\}|\[|\]/,
  roperator = /\+\+|\-\-|\+=|\-=|\*=|%=|\/=|\+|\-|\*|\/|<=|>=|<<|>>|>|<|===|!==|==|!=|!|&&|\|\||&|\||\?|:|~|%/,
  rassign = /=/,
  rspace = /[\s\n\r\t]/,
  rquotation = /['"]/;

let lastIndex = 0, parsed = [];
let lookahead = lastIndex + 1;
let line = 1;

function getToken(match, type) {
  const cachedIndex = lastIndex,
    token = match[0];
  lastIndex += token.length;
  lookahead = lastIndex + 1;
  if (token === 'null' || token === 'undefined') {
    type = token;
  }
  console.warn({
    token: type !== 'string' ? token : match[2],
    len: token.length,
    type: type,
    pos: cachedIndex
  });
  return {
    token: type !== 'string' ? token : match[2],
    len: token.length,
    type: type,
    pos: cachedIndex
  };
}

function throwSyntaxError(currentCode, line, index) {
  throw new Error('Syntax error at line ' + line + ', index:' + index + ', error code:' + currentCode);
}

module.exports = function tokenizer(testCode) {
  const codeLen = testCode.length;
  let isTrackingString = false;
  //使用lastIndex和lookahead维护一个缓冲区
  //缓冲区的初始大小为1,即只保存一个字符
  //但是会有很多情况需要追加字符再进行匹配
  while (lastIndex < codeLen && lookahead <= codeLen) {
    while (lookahead <= codeLen) {
      const currentCode = testCode.slice(lastIndex, lookahead);
      let nextLetter = testCode[lookahead] == null ? '' : testCode[lookahead];
      const currentFirstLetter = currentCode[0],
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

      if (currentCode.match(/[\n\r]/)) {
        line++;
      }

      //如果是空格或者换行,直接跳到下一个字符(除非是正在匹配字符串)
      if (mspace && !isTrackingString) {
        lastIndex++;
        lookahead++;
        break;
      }

      // 优先处理字符串匹配,因为字符串和标识符的匹配是冲突的
      // 读到'或者"时,不断地向缓冲区加入新字符直至匹配到结尾的'或者"
      // 如果结尾和开头不同为'或者",则报语法错误
      // 这个字符串匹配还是有bug!
      if (currentFirstLetter.match(rquotation)) {
        if (currentCode.length === 1
          || currentCode.length > 1 && currentLastLetter !== currentFirstLetter
          || currentLastLetter === currentFirstLetter && currentCode[currentCode.length - 2] === '\\') {
          // 如果匹配到空白符,lastIndex不能++
          if (nextLetter.match(rspace)) {
            isTrackingString = true;
          }
          lookahead++;
          break;
        } else if (currentLastLetter !== currentFirstLetter) {
          throwSyntaxError(currentCode, line, lastIndex);
        }
      }
      //匹配字符串
      if (mstring) {
        isTrackingString = false;
        parsed.push(getToken(mstring, 'string'));
        break;
      } else if (mkeyword) {
        if (nextLetter.match(/\w/)) {
          lookahead++;
          break;
        }
        parsed.push(getToken(mkeyword, 'keyword'));
        break;
      } else if (mbool) {
        //如果后一个字符还是字母或者数字,说明不是true/false而是变量
        if (nextLetter.match(/\w/)) {
          lookahead++;
          break;
        }
        parsed.push(getToken(mbool, 'bool'));
        break;
      } else if (mid) {
        if (nextLetter.match(/[\w\d_$]/)) {
          lookahead++;
          break;
        }
        parsed.push(getToken(mid, 'id'));
        break;
      } else if (mnum) {
        if (nextLetter.match(/[\.\d]/)) {
          lookahead++;
          break;
        }
        if (nextLetter.match(/\w/)) {
          throwSyntaxError(currentCode, line);
        }
        parsed.push(getToken(mnum, 'number'));
        break;
      } else if (mpunctuation) {
        parsed.push(getToken(mpunctuation, 'punctuation'));
        break;
      } else if (moperator) {
        const currentLetter = moperator[0];
        //以下操作符可能是某个更长的操作符的一部分
        //因此遇到以下操作符直接向缓冲区追加一个字符进行匹配
        if (currentLetter === '|' && nextLetter === '|' ||
          currentLetter === '&' && nextLetter === '&') {
          lookahead++;
          break;
        } else if (currentLetter === '<' && (nextLetter === '<' || nextLetter === '=')
          || currentLetter === '>' && (nextLetter === '>' || nextLetter === '=')) {
          lookahead++;
          break;
        } else if (currentLetter === '+' && nextLetter === '+'
          || currentLetter === '-' && nextLetter === '-') {
          lookahead++;
          break;
        } else if (currentLetter === '+'
          || currentLetter === '-'
          || currentLetter === '*'
          || currentLetter === '/'
          || currentLetter === '%') {
          if (nextLetter === '=') {
            lookahead++;
            break;
          }
        } else if (currentLetter === '!') {
          //匹配!==
          if (nextLetter === '=') {
            lookahead++;
            if (currentCode[lookahead + 1] === '=') {
              lookahead++;
            }
            break;
          }
        }
        parsed.push(getToken(moperator, 'operator'));
        break;
      } else if (massign) {
        //=可能是===的一部分,因此直接追加一个字符
        const extended = testCode.slice(lastIndex, lookahead + 1);
        if (nextLetter === '=') {
          lookahead++;
          if (extended.charAt(extended.length - 1) === '=') {
            lookahead++;
          }
          break;
        }
        parsed.push(getToken(massign, 'assign'));
        break;
      }
      //出现空匹配,报语法错误
      throwSyntaxError(currentCode, line, lastIndex);
    }
  }

  return parsed;
};
