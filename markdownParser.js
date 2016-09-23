'use strict';

const rhead = /^(\#+)\s+(.*)$/,
    rli = /^\-\s+(.*)$/,
    rsinglelinecode = /^``(.*)``$/,
    rmultilinecode = /^```$/,
    rbold = /^\*\*\s+(.*)\s+\*\*$/;

function parse(lineList, prev) {
    let car = lineList[0],
        cdr = lineList.slice(1);

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

        //开始收集这个section的所有子孙元素,push到tobeParsed数组中
        let next = cdr[0];
        while (next) {
            //如果当前行没有匹配这个h的末尾并且不是最后一行,向tobeParsed推入一行
            if (next && !(next.type === 'head' && next.tag.length === lvl)) {
                tobeParsed.push(next);
                cdr = cdr.slice(1);
                next = cdr[0];
            }
            else {
                break;
            }
        }
        //解析tobeParsed,并且添加尾部关闭标签
        ret += parse(tobeParsed, car) + "</div></section>"
            //递归处理文档余下的部分
            + parse(cdr, car);
        return ret;
    }
    //处理li
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
        return ret + parse(cdr, car);
    }
    //处理普通行
    else if (car.type === 'content') {
        return car.content + "<br/>" + parse(cdr, car);
    }
    //处理单行代码
    else if (car.type === 'singlelinecode') {
        return "<code>" + car.content + "</code>" + parse(cdr, car);
    }
    //处理单行加粗
    else if (car.type === 'bold') {
        return "<b>" + car.content + "</b>" + parse(cdr, car);
    }
    //处理多行代码
    else if (car.type === 'multilinecode') {
        let next = cdr[0], ret = '<code>';
        //对于```之间的所有行,全部按照普通行处理
        while (next) {
            if (next.type === 'multilinecode') {
                ret += '</code>';
                break;
            }
            ret += next.content + '<br/>';
            cdr = cdr.slice(1);
            next = cdr[0];
        }
        ret += parse(cdr.slice(1), car);
        return ret;
    }
}

module.exports = function markdownParser(text) {
    const lines = text.split(/[\r\n]+/);
    return parse(lines.map(line=> {
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
    }), null);
};
