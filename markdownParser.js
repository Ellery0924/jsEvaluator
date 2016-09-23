'use strict';

const rhead = /^(\#+)\s+(.*)$/,
    rli = /^\-\s+(.*)$/,
    rsinglelinecode = /^``(.*)``$/,
    rmultilinecode = /^```$/,
    rbold = /^\*\*\s+(.*)\s+\*\*$/;

//递归下降的md解析器
function markdownParser(lineList, prev) {
    //car始终指向待处理列表的第一个元素
    let car = lineList[0],
        //cdr是待处理列表的尾部,即除了第一个元素的其余部分
        cdr = lineList.slice(1);

    //空列表直接返回'',递归的终止条件
    if (lineList.length === 0) {
        return '';
    }

    //处理#
    if (car.type === 'head') {
        //当前head的层级
        const lvl = car.tag.length;
        let ret = "<section>" +
                "<h" + lvl + '>' + car.content + '</h' + lvl + '>' +
                "<div>",
            tobeParsed = [];

        //收集这个section的所有子孙元素,push到tobeParsed数组中
        //next始终指向下一行
        let next = cdr[0];
        while (next) {
            //如果当前行没有匹配这个h的末尾并且不是最后一行,向tobeParsed推入一行,并且重置next指针
            if (next && !(next.type === 'head' && next.tag.length === lvl)) {
                tobeParsed.push(next);
                cdr = cdr.slice(1);
                next = cdr[0];
            }
            else {
                break;
            }
        }
        //递归地解析tobeParsed,并且添加尾部关闭标签
        ret += markdownParser(tobeParsed, car) + "</div></section>"
            //递归地处理文档余下的部分
            + markdownParser(cdr, car);
        return ret;
    }
    //处理-
    else if (car.type === 'li') {
        //li元素
        let ret = "<li>" + car.content + "</li>";
        //检测是不是第一个li,如果是,追加一个<ul>,这里利用了传入的prev参数
        if (prev && prev.type !== 'li') {
            ret = "<ul>" + ret;
        }
        //检测是不是最后一个li,如果是,追加一个</ul>
        if (!cdr[0] || cdr[0].type !== 'li') {
            ret += '</ul>';
        }
        return ret + markdownParser(cdr, car);
    }
    //处理普通行
    else if (car.type === 'content') {
        return car.content + "<br/>" + markdownParser(cdr, car);
    }
    //处理``
    else if (car.type === 'singlelinecode') {
        return "<code>" + car.content + "</code>" + markdownParser(cdr, car);
    }
    //处理**
    else if (car.type === 'bold') {
        return "<b>" + car.content + "</b>" + markdownParser(cdr, car);
    }
    //处理```
    else if (car.type === 'multilinecode') {
        let next = cdr[0], ret = '<code>';
        //收集两个```之间的所有行,对于```之间的所有行,全部按照普通行处理,不做任何解析
        while (next) {
            if (next.type === 'multilinecode') {
                ret += '</code>';
                break;
            }
            ret += next.content + '<br/>';
            cdr = cdr.slice(1);
            next = cdr[0];
        }
        ret += markdownParser(cdr.slice(1), car);
        return ret;
    }
}

//markdown的tokenizer,只按行处理token,非常简单
function markdownTokenizer(text) {
    const lines = text.split(/[\r\n]+/);
    return lines.map(line=> {
        const mhead = line.match(rhead),
            mli = line.match(rli),
            mslcode = line.match(rsinglelinecode),
            mmlcode = line.match(rmultilinecode),
            mbold = line.match(rbold);

        if (mhead) {
            return {type: 'head', tag: mhead[1], content: mhead[2]};
        }
        else if (mli) {
            return {type: 'li', content: mli[1]};
        }
        else if (mslcode) {
            return {type: 'singlelinecode', content: mslcode[1]};
        }
        else if (mmlcode) {
            return {type: 'multilinecode', tag: mmlcode[1]};
        }
        else if (mbold) {
            return {type: 'bold', content: mbold[1]};
        }
        else {
            return {type: 'content', content: line};
        }
    })
}

module.exports = function (text) {
    return markdownParser(markdownTokenizer(text), null);
};
