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

    function matchType(type, parent, optional) {
        const currentToken = tokens[current];
        if (current < tokens.length) {
            const m = currentToken.type.match(type);
            if (m) {
                toNextPos();
                ast.append(new Node(currentToken.token, currentToken.type), parent);
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
        return tokens.slice(from).find(token=>
                token.token === '='
                || token.token === '?'
                || token.token === '+='
                || token.token === '-='
                || token.token === '*='
                || token.token === '/='
            ) || {token: 'others'};
    }

    function Expr(node, from) {
        if (current < tokens.length) {
            const keyTerm = findFirstKeyTerm(from);
            const exprRoot = ast.append(new Node('EXPR', 'NON_TERM'), node);
            switch (keyTerm.token) {
                case '=':
                case '+=':
                case '-=':
                case '*=':
                case '/=':
                    assign(exprRoot);
                    break;
                case '?':
                    threeItemOperation(exprRoot);
                    break;
                default:
                    or(exprRoot);
            }
        }
    }

    function assign(parent) {
        const node = ast.append(new Node('ASSIGN', 'NON_TERM'), parent);
        Lval(node);
        matchToken(/\+=|\-=|\*=|\/=|=/, node);
        Rval(node, current);
    }

    function Lval(parent) {
        const node = ast.append(new Node('LVAL', 'NON_TERM'), parent);
        if (matchToken(/\(/, node, true)) {
            matchType(/id/, node);
            LvalRest(node);
            matchToken(/\)/, node, true);
        }
        else {
            matchType(/id/, node);
            LvalRest(node);
        }
    }

    function Rval(parent) {
        const node = ast.append(new Node('RVAL', 'NON_TERM'), parent);
        Expr(node, current);
    }

    function LvalRest(parent) {
        const node = new Node('LVAL_REST', 'NON_TERM');
        if (matchToken(/\./, node, true)) {
            matchType(/id/, node);
            LvalRest(node);
            ast.append(node, parent);
        }
        else if (matchToken(/\[/, node, true)) {
            matchType(/string|number|id|bool/, node);
            matchToken(/\]/, node);
            LvalRest(node);
            ast.append(node, parent);
        }
    }

    function threeItemOperation(parent) {
        const node = ast.append(new Node('THREE_ITEM_OPERATION', 'NON_TERM'), parent);
        or(node);
        if (matchToken(/\?/, node, true)) {
            threeItemOperation(node);
            matchToken(/:/, node);
            threeItemOperation(node);
        }
    }

    function or(parent) {
        const node = ast.append(new Node('OR', 'NON_TERM'), parent);
        and(node);
        orRest(node);
    }

    function orRest(parent) {
        const node = new Node('OR_REST', 'NON_TERM');
        if (matchToken(/\|\|/, node, true)) {
            and(node);
            orRest(node);
            ast.append(node, parent);
        }
    }

    function and(parent) {
        const node = ast.append(new Node('AND', 'NON_TERM'), parent);
        compare(node);
        andRest(node);
    }

    function andRest(parent) {
        const node = new Node('AND_REST', 'NON_TERM');
        if (matchToken(/&&/, node, true)) {
            compare(node);
            andRest(node);
            ast.append(node, parent);
        }
    }

    function compare(parent) {
        const node = ast.append(new Node('COMPARE', 'NON_TERM'), parent);
        plusOrMinus(node);
        compareRest(node);
    }

    function compareRest(parent) {
        const node = new Node('COMPARE_REST', 'NON_TERM');
        if (matchToken(/>|>=|<|<=|===|!==/, node, true)) {
            plusOrMinus(node);
            compareRest(node);
            ast.append(node, parent);
        }
    }

    function plusOrMinus(parent) {
        const node = ast.append(new Node('PLUS_MINUS', 'NON_TERM'), parent);
        multiOrDiv(node);
        plusOrMinusRest(node);
    }

    function plusOrMinusRest(parent) {
        const node = new Node('PLUS_MINUS_REST', 'NON_TERM');
        if (matchToken(/^(\+|\-)$/, node, true)) {
            multiOrDiv(node);
            plusOrMinusRest(node);
            ast.append(node, parent);
        }
    }

    function multiOrDiv(parent) {
        //console.log(parent);
        const node = ast.append(new Node('MULTI_DIV', 'NON_TERM'), parent);
        Factor(node);
        multiOrDivRest(node);
    }

    function multiOrDivRest(parent) {
        const node = new Node('MULTI_DIV_REST', 'NON_TERM');
        if (matchToken(/^(\*|\/)$/, node, true)) {
            Factor(node);
            multiOrDivRest(node);
            ast.append(node, parent);
        }
    }

    function Factor(parent) {
        const node = ast.append(new Node('FACTOR', 'NON_TERM'), parent);
        const currentToken = tokens[current],
            type = currentToken.type,
            token = currentToken.token;

        if (type.match(/string|number|bool|undefined|null/)) {
            matchType(/string|number|bool|undefined|null/, node);
        }
        else if (type.match(/id/)) {
            Lval(node);
        }
        else if (token.match(/\+\+|\-\-/)) {
            selfPlusOrMinus(node);
        }
        else if (token.match(/!/)) {
            matchToken(/!/, node);
            Factor(node);
        }
        else if (token.match(/\{/)) {
            object(node);
        }
        else if (token.match(/\[/)) {
            array(node);
        }
        else if (token.match(/\(/)) {
            matchToken(/\(/, node);
            Expr(node, current);
            matchToken(/\)/, node);
        }
    }

    function selfPlusOrMinus(parent) {
        const node = ast.append(new Node('SELF_PLUS_MINUS', 'NON_TERM'), parent);
        matchToken(/\-\-|\+\+/, node);
        selfPlusOrMinusRest(node);
    }

    function selfPlusOrMinusRest(parent) {
        const node = new Node('SELF_PLUS_MINUS_REST', 'NON_TERM');
        if (matchToken(/\(/, node, true)) {
            Lval(node);
            matchToken(/\)/, node);
        }
        else {
            Lval(node);
        }
        ast.append(node, parent);
    }

    function object(parent) {
        const node = ast.append(new Node('OBJECT', 'NON_TERM'), parent);
        matchToken(/\{/, node);
        objectContent(node);
        matchToken(/\}/, node);
    }

    function objectContent(parent) {
        const node = new Node('OBJECT_CONTENT', 'NON_TERM');
        if (matchType(/id|string|number/, node, true)) {
            matchToken(/:/, node);
            Expr(node, current);
            ast.append(node, parent);
            if (matchToken(/\,/, node, true)) {
                objectContent(node);
            }
        }
    }

    function array(parent) {
        const node = ast.append(new Node('ARRAY', 'NON_TERM'), parent);
        matchToken(/\[/, node, true);
        arrayContent(node);
        matchToken(/\]/, node, true);
    }

    function arrayContent(parent) {
        const node = ast.append(new Node('ARRAY_CONTENT', 'NON_TERM'), parent);
        Expr(node, current);
        if (matchToken(/\,/, node, true)) {
            arrayContent(node);
        }
    }

    function flattenAST(node) {
        if (node.children.length === 1) {
            const onlyChild = node.children[0];
            if (node === ast.root) {
                ast.root = onlyChild;
                flattenAST(onlyChild);
            }
            else {
                const indexInParent = node.parent.children.indexOf(node);
                node.parent.children.splice(indexInParent, 1, onlyChild);
                onlyChild.parent = node.parent;
                flattenAST(onlyChild);
            }
        }
        else {
            node.children.forEach(child=>flattenAST(child));
        }
    }

    function clearAST(node) {
        if (node.parent) {
            delete node.parent;
        }
        node.children.forEach(child=>clearAST(child));
    }

    Expr(null, 0);
    flattenAST(ast.root);
    clearAST(ast.root);
    return ast;
};