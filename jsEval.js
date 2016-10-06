'use strict';
const util = require('util');
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

//let GUID = -1;
class Node {
    constructor(token, type) {
        this.token = token;
        this.type = type;
        this.children = [];
        //this.guid = ++GUID;
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

    function matchToken(token, parent, appendNode, optional) {
        const currentToken = tokens[current];
        //console.log(currentToken)
        //console.trace();
        //console.log(JSON.stringify(ast, null, 4));
        if (current < tokens.length) {
            const m = currentToken.token.match(token);
            if (m) {
                toNextPos();
                //console.log(m[0] + ' matched.');
                if (appendNode) {
                    ast.append(new Node(currentToken.token, currentToken.type), parent);
                }
                return true;
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

    function matchType(type, parent, appendNode, optional) {
        const currentToken = tokens[current];
        if (current < tokens.length) {
            //console.log(currentToken)
            const m = currentToken.type.match(type);
            if (m) {
                toNextPos();
                //console.log(currentToken.token + ' matched.');
                if (appendNode) {
                    ast.append(new Node(currentToken.token, currentToken.type), parent);
                }
                return true;
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
        return tokens.slice(from).find(token=>token.token.match(/=|\?/)) || {token: 'others'};
    }

    function Expr(node, from) {
        //console.log(tokens[current])
        if (current < tokens.length) {
            const keyTerm = findFirstKeyTerm(from);
            const exprRoot = ast.append(new Node('EXPR', 'NON_TERM'), node);
            switch (keyTerm.token) {
                case '=':
                    Expr0(exprRoot);
                    break;
                case '?':
                    Expr1(exprRoot);
                    break;
                default:
                    Expr2(exprRoot);
            }
        }
    }

    function Expr0(parent) {
        const node = ast.append(new Node('EXPR_0', 'NON_TERM'), parent);
        Lval(node);
        matchToken(/=/, node);
        Rval(node, current);
    }

    function Lval(parent) {
        const node = ast.append(new Node('LVAL', 'NON_TERM'), parent);
        matchType(/id/, node);
        LvalTail(node);
    }

    function Rval(parent) {
        const node = ast.append(new Node('RVAL', 'NON_TERM'), parent);
        Expr(node, current);
    }

    function LvalTail(parent) {
        const node = ast.append(new Node('LVAL_TAIL', 'NON_TERM'), parent);
        if (matchToken(/\./, node, true)) {
            matchType(/id/, node);
            LvalTail(node);
        }
        else if (matchToken(/\[/, node, true)) {
            matchType(/string|number|id|bool/, node);
            matchToken(/\]/, node);
            LvalTail(node)
        }
    }

    function Expr1(parent) {
        const node = ast.append(new Node('EXPR_1', 'NON_TERM'), parent);
        Expr2(node);

        if (matchToken(/\?/, node, true)) {
            Expr1(node);
            matchToken(/:/, node);
            Expr1(node);
        }
    }

    function Expr2(parent) {
        const node = ast.append(new Node('EXPR_2', 'NON_TERM'), parent);
        //console.warn(2)
        Expr3(node);
        Expr2Tail(node);
    }

    function Expr2Tail(parent) {
        const node = ast.append(new Node('EXPR_2_TAIL', 'NON_TERM'), parent);
        if (matchToken(/\|\|/, node, true)) {
            Expr3(node);
            Expr2Tail(node);
        }
    }

    function Expr3(parent) {
        const node = ast.append(new Node('EXPR_3', 'NON_TERM'), parent);
        Expr4(node);
        Expr3Tail(node);
    }

    function Expr3Tail(parent) {
        const node = ast.append(new Node('EXPR_3_TAIL', 'NON_TERM'), parent);
        if (matchToken(/&&/, node, true)) {
            Expr4(node);
            Expr3Tail(node);
        }
    }

    function Expr4(parent) {
        const node = ast.append(new Node('EXPR_4', 'NON_TERM'), parent);
        Expr5(node);
        Expr4Tail(node);
    }

    function Expr4Tail(parent) {
        const node = ast.append(new Node('EXPR_4_TAIL', 'NON_TERM'), parent);
        if (matchToken(/>|>=|<|<=|===|!==/, node, true)) {
            Expr5(node);
            Expr4Tail(node);
        }
    }

    function Expr5(parent) {
        const node = ast.append(new Node('EXPR_5', 'NON_TERM'), parent);
        //console.warn(5);
        Expr6(node);
        Expr5Tail(node);
    }

    function Expr5Tail(parent) {
        const node = ast.append(new Node('EXPR_5_TAIL', 'NON_TERM'), parent);
        //console.warn(tokens[current], matchToken(/\+|\-/, node, true));
        if (matchToken(/\+|\-/, node, true)) {
            Expr6(node);
            Expr5Tail(node);
        }
    }

    function Expr6(parent) {
        //console.log(parent);
        const node = ast.append(new Node('EXPR_6', 'NON_TERM'), parent);
        Factor(node);
        Expr6Tail(node);
    }

    function Expr6Tail(parent) {
        const node = ast.append(new Node('EXPR_6_TAIL', 'NON_TERM'), parent);
        if (matchToken(/\*|\//, node, true)) {
            Factor(node);
            Expr6Tail(node);
        }
    }

    function Factor(parent) {
        const node = ast.append(new Node('FACTOR', 'NON_TERM'), parent);
        const currentToken = tokens[current],
            type = currentToken.type,
            token = currentToken.token;

        console.warn(currentToken, 'factor');

        if (type.match(/string|number|bool|undefined|null/)) {
            //console.warn('matched number' , tokens[current], tokens[current+1]);
            matchType(/string|number|bool|undefined|null/, node);
        }
        else if (type.match(/id/)) {
            Lval(node);
        }
        else if (token.match(/\+\+|\-\-/)) {
            Expr7(node);
        }
        else if (token.match(/!/)) {
            matchToken(/!/, node);
            Factor(node);
        }
        else if (token.match(/\{/)) {
            evalObject(node);
        }
        else if (token.match(/\[/)) {
            evalArray(node);
        }
        //else {
        //    error();
        //}
    }

    function Expr7(parent) {
        const node = ast.append(new Node('EXPR_7', 'NON_TERM', parent));
        matchToken(/\-\-|\+\+/, node);
        Expr7Tail(node);
    }

    function Expr7Tail(parent) {
        const node = ast.append(new Node('EXPR_7_TAIL', 'NON_TERM'), parent);
        if (matchToken(/\(/, node, true)) {
            Lval(node);
            matchToken(/\)/, node);
        }
        Lval(node);
    }

    function evalObject(parent) {
        const node = ast.append(new Node('OBJECT', 'NON_TERM'), parent);
        matchToken(/\{/, node);
        evalObjectContent(node);
        //console.trace();
        matchToken(/\}/, node);
        //console.log('complete')
    }

    function evalObjectContent(parent) {
        const node = ast.append(new Node('OBJECT_CONTENT', 'NON_TERM'), parent);
        if (matchType(/id|string|number/, node, true)) {
            matchToken(/:/, node);
            Expr(node, current);
            if (matchToken(/\,/, node, true)) {
                evalObjectContent(node);
            }
        }
    }

    function evalArray(parent) {
        const node = ast.append(new Node('ARRAY', 'NON_TERM'), parent);
        matchToken(/\[/, node, true);
        evalArrayContent(node);
        matchToken(/\]/, node, true);
    }

    function evalArrayContent(parent) {
        const node = ast.append(new Node('ARRAY_CONTENT', 'NON_TERM'), parent);
        Expr(node, current);
        if (matchToken(/\,/, node, true)) {
            evalArrayContent(node);
        }
    }

    //function clearAST(node) {
    //
    //    function onlyChild(node) {
    //        const parent = node.parent;
    //        return parent.children.length === 1;
    //    }
    //
    //    if (node.children.length) {
    //        node.children.forEach(child=> {
    //
    //        });
    //    }
    //}

    Expr(null, 0);
    console.log(JSON.stringify(clearAST(ast.root), 4));
};