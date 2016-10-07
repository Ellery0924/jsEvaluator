'use strict';
let current = 0, lookAhead = 1;

class AST {
    constructor() {
        this.root = null;
    }

    append(node, target) {
        if (this.root === null) {
            this.root = node;
        }
        else {
            target.children.push(node);
            node.parent = target;
        }
        return node;
    }
}

class Node {
    constructor(token, type) {
        this.token = token;
        this.type = type;
        this.children = [];
        this.parent = null;
    }
}

module.exports = function evalJs(tokens) {
    const ast = new AST();

    function error() {
        throw new Error('syntax error, parsing:' + tokens[current].token);
    }

    function toNextPos() {
        current++;
        lookAhead = current + 1;
    }

    function matchToken(token, parent, optional) {
        const currentToken = tokens[current];
        if (current < tokens.length) {
            const m = currentToken.token.match(token);
            if (m) {
                toNextPos();
                ast.append(new Node(currentToken.token, currentToken.type), parent);
                return currentToken;
            }
            else {
                if (optional) {
                    return false;
                }
                else {
                    error();
                }
            }
        }
    }

    function matchType(type, parent, optional) {
        const currentToken = tokens[current];
        if (current < tokens.length) {
            const m = currentToken.type.match(type);
            if (m) {
                toNextPos();
                ast.append(new Node(currentToken.token, currentToken.type), parent);
                return currentToken;
            }
            else {
                if (optional) {
                    return false;
                }
                error();
            }
        }
    }

    function findFirstKeyTerm(from) {
        return tokens.slice(from).find(token=>token.token === '=' || token.token === '?') || {token: 'others'};
    }

    function Expr(node, from) {
        if (current < tokens.length) {
            const keyTerm = findFirstKeyTerm(from);
            const exprRoot = ast.append(new Node('EXPR', 'NON_TERM'), node);
            switch (keyTerm.token) {
                case '=':
                    return Expr0(exprRoot);
                    break;
                case '?':
                    return Expr1(exprRoot);
                    break;
                default:
                    return Expr2(exprRoot);
            }
        }
    }

    function Expr0(parent) {
        const node = ast.append(new Node('EXPR_0', 'NON_TERM'), parent);
        Lval(node);
        matchToken(/=/, node);
        return Rval(node, current);
    }

    function Lval(parent) {
        const node = ast.append(new Node('LVAL', 'NON_TERM'), parent);
        matchType(/id/, node);
        LvalTail(node);
    }

    function Rval(parent) {
        const node = ast.append(new Node('RVAL', 'NON_TERM'), parent);
        return Expr(node, current);
    }

    function LvalTail(parent) {
        const node = new Node('LVAL_TAIL', 'NON_TERM');
        if (matchToken(/\./, node, true)) {
            matchType(/id/, node);
            LvalTail(node);
            ast.append(node, parent);
        }
        else if (matchToken(/\[/, node, true)) {
            matchType(/string|number|id|bool/, node);
            matchToken(/\]/, node);
            LvalTail(node);
            ast.append(node, parent);
        }
    }

    function Expr1(parent) {
        const node = ast.append(new Node('EXPR_1', 'NON_TERM'), parent);
        const cond = Expr2(node);
        if (matchToken(/\?/, node, true)) {
            const then = Expr1(node);
            matchToken(/:/, node);
            const els = Expr1(node);

            if (cond) {
                return then;
            }
            return els;
        }

        return cond;
    }

    function Expr2(parent) {
        const node = ast.append(new Node('EXPR_2', 'NON_TERM'), parent);
        const first = Expr3(node);
        if (matchToken(/\|\|/, node, true)) {
            const rest = Expr2(node);
            if (first) {
                return first;
            }
            return rest;
        }

        return first;
    }

    function Expr3(parent) {
        const node = ast.append(new Node('EXPR_3', 'NON_TERM'), parent);
        const first = Expr4(node);
        if (matchToken(/&&/, node, true)) {
            const rest = Expr3(node);
            if (first) {
                if (rest) {
                    return true;
                }
            }
            return false;
        }

        return first;
    }

    function Expr4(parent) {
        const node = ast.append(new Node('EXPR_4', 'NON_TERM'), parent);
        const first = Expr5(node);
        const operatorToken = matchToken(/>|>=|<|<=|===|!==/, node, true);
        if (operatorToken) {
            const rest = Expr4(node);
            const operator = operatorToken.token;
            if (operator === '>') {
                return first > rest;
            }
            else if (operator === '>=') {
                return first >= rest;
            }
            else if (operator === '<') {
                return first < rest;
            }
            else if (operator === '<=') {
                return first <= rest;
            }
            else if (operator === '===') {
                return first === rest;
            }
            else if (operator === '!==') {
                return first !== rest;
            }
        }

        return first;
    }

    function Expr5(parent) {
        const node = ast.append(new Node('EXPR_5', 'NON_TERM'), parent);
        const first = Expr6(node);
        const operatorToken = matchToken(/\+|\-/, node, true);

        if (operatorToken) {
            const rest = Expr5(node);
            const operator = operatorToken.token;

            if (operator === '+') {
                return first + rest;
            }
            return first - rest;
        }

        return first;
    }

    function Expr6(parent) {
        const node = ast.append(new Node('EXPR_6', 'NON_TERM'), parent);
        const first = Factor(node);
        const operatorToken = matchToken(/\*|\//, node, true);

        if (operatorToken) {
            const rest = Expr6(node);
            const operator = operatorToken.token;

            if (operator === '*') {
                return first * rest;
            }
            return first / rest;
        }

        return first;
    }

    function Factor(parent) {
        if (current < tokens.length) {
            const node = ast.append(new Node('FACTOR', 'NON_TERM'), parent);
            const currentToken = tokens[current],
                type = currentToken.type,
                token = currentToken.token,
                nextToken = lookAhead < tokens.length ? tokens[lookAhead].token : '';

            if (type.match(/string|number|bool|undefined|null/)) {
                const valToken = matchType(/string|number|bool|undefined|null/, node);
                const type = valToken.type, valStr = valToken.token;
                if (type === 'string') {
                    return valStr;
                }
                else if (type === 'number') {
                    return Number(valStr);
                }
                else if (type === 'bool') {
                    if (valStr === 'true') {
                        return true;
                    }
                    return false;
                }
                else if (type === 'undefined') {
                    return undefined;
                }
                else if (type === 'null') {
                    return null;
                }
            }
            else if (token.match(/\+\+|\-\-|\+=|-=|\*=|\/=/)
                || type === 'id' && nextToken.match(/\+\+|\-\-/)) {
                return Expr7(node);
            }
            else if (type.match(/id/)) {
                return Lval(node);
            }
            else if (token.match(/!/)) {
                matchToken(/!/, node);
                return !Factor(node);
            }
            else if (token.match(/\{/)) {
                return Obj(node);
            }
            else if (token.match(/\[/)) {
                return Arr(node);
            }
            else if (token.match(/\(/)) {
                matchToken(/\(/, node);
                const val = Expr(node, current);
                matchToken(/\)/, node);
                return val;
            }
        }
    }

    function Expr7(parent) {
        const node = ast.append(new Node('EXPR_7', 'NON_TERM'), parent);
        const first = matchToken(/\-\-|\+\+/, node, true);
        if (first) {
            Expr7Tail(node);
        }
        else {
            Expr7Tail(node);
            matchToken(/\-\-|\+\+/, node);
        }
    }

    function Expr7Tail(parent) {
        const node = new Node('EXPR_7_TAIL', 'NON_TERM');
        if (matchToken(/\(/, node, true)) {
            Lval(node);
            matchToken(/\)/, node);
        }
        else {
            Lval(node);
        }
        ast.append(node, parent);
    }

    function Obj(parent) {
        const node = ast.append(new Node('OBJECT', 'NON_TERM'), parent);
        matchToken(/\{/, node);
        ObjContent(node);
        matchToken(/\}/, node);
    }

    function ObjContent(parent) {
        const node = new Node('OBJECT_CONTENT', 'NON_TERM');
        if (matchType(/id|string|number/, node, true)) {
            matchToken(/:/, node);
            Expr(node, current);
            ast.append(node, parent);
            if (matchToken(/\,/, node, true)) {
                ObjContent(node);
            }
        }
    }

    function Arr(parent) {
        const node = ast.append(new Node('ARRAY', 'NON_TERM'), parent);
        matchToken(/\[/, node, true);
        ArrContent(node);
        matchToken(/\]/, node, true);
    }

    function ArrContent(parent) {
        const node = ast.append(new Node('ARRAY_CONTENT', 'NON_TERM'), parent);
        Expr(node, current);
        if (matchToken(/\,/, node, true)) {
            ArrContent(node);
        }
    }

    function flatAST(node) {
        if (node.children.length === 1) {
            const onlyChild = node.children[0];
            if (node === ast.root) {
                ast.root = onlyChild;
                flatAST(onlyChild);
            }
            else {
                const indexInParent = node.parent.children.indexOf(node);
                node.parent.children.splice(indexInParent, 1, onlyChild);
                onlyChild.parent = node.parent;
                flatAST(onlyChild);
            }
        }
        else {
            node.children.forEach(child=>flatAST(child));
        }
    }

    function clearAST(node) {
        if (node.parent) {
            delete node.parent;
        }
        if (node.children.length === 0) {
            delete node.children;
        }
        if (node.children) {
            node.children.forEach(child=>clearAST(child));
        }
    }

    console.log('eval result: ' + Expr(null, 0));
    flatAST(ast.root);
    clearAST(ast.root);
    return ast;
};