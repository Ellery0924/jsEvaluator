'use strict';
const Parser = require('./Parser');
const AST = require('./AST').AST;
const Node = require('./AST').Node;

class _Expression extends Parser {
    constructor(ast, tokens) {
        super(ast, tokens);
    }

    parse() {
        const self = this;

        function expression(tokens, node) {
            function findFirstKeyTerm(from) {
                return tokens.slice(from).find(token=>
                        token.token === '='
                        || token.token === '+='
                        || token.token === '-='
                        || token.token === '*='
                        || token.token === '/='
                        || token.token === '%='
                        || token.token === '?'
                    ) || {token: 'others'};
            }

            function expr(node, from) {
                if (self.current < tokens.length) {
                    const keyTerm = findFirstKeyTerm(from);
                    const exprRoot = self.ast.append(new Node('EXPR', 'NON_TERM'), node);
                    switch (keyTerm.token) {
                        case '=':
                        case '+=':
                        case '-=':
                        case '*=':
                        case '/=':
                        case '%=':
                            assign(exprRoot);
                            break;
                        case '?':
                            threeItemOperation(exprRoot);
                            break;
                        default:
                            or(exprRoot);
                            break;
                    }
                }
            }

            function assign(parent) {
                const node = self.ast.append(new Node('ASSIGN', 'NON_TERM'), parent);
                lVal(node);
                self.matchToken(/\+=|\-=|\*=|\/=|=/, node);
                rVal(node, self.current);
            }

            function lVal(parent) {
                const node = self.ast.append(new Node('LVAL', 'NON_TERM'), parent);
                if (self.matchToken(/\(/, node, true)) {
                    self.matchType(/id|number|string|bool/, node);
                    lValRest(node);
                    self.matchToken(/\)/, node, true);
                }
                else {
                    self.matchType(/id|number|string|bool/, node);
                    lValRest(node);
                }
            }

            function rVal(parent) {
                const node = self.ast.append(new Node('RVAL', 'NON_TERM'), parent);
                expr(node, self.current);
            }

            function lValRest(parent) {
                const node = new Node('LVAL_REST', 'NON_TERM');
                if (self.matchToken(/\./, node, true)) {
                    self.matchType(/id/, node);
                    lValRest(node);
                    self.ast.append(node, parent);
                }
                else if (self.matchToken(/\[/, node, true)) {
                    lVal(node, self.current);
                    self.matchToken(/\]/, node);
                    lValRest(node);
                    self.ast.append(node, parent);
                }
            }

            function threeItemOperation(parent) {
                const node = self.ast.append(new Node('THREE_ITEM_OPERATION', 'NON_TERM'), parent);
                or(node);
                if (self.matchToken(/\?/, node, true)) {
                    threeItemOperation(node);
                    self.matchToken(/:/, node);
                    threeItemOperation(node);
                }
            }

            function or(parent) {
                const node = self.ast.append(new Node('OR', 'NON_TERM'), parent);
                and(node);
                orRest(node);
            }

            function orRest(parent) {
                const node = new Node('OR_REST', 'NON_TERM');
                if (self.matchToken(/\|\|/, node, true)) {
                    and(node);
                    orRest(node);
                    self.ast.append(node, parent);
                }
            }

            function and(parent) {
                const node = self.ast.append(new Node('AND', 'NON_TERM'), parent);
                instanceOfAndIn(node);
                andRest(node);
            }

            function andRest(parent) {
                const node = new Node('AND_REST', 'NON_TERM');
                if (self.matchToken(/&&/, node, true)) {
                    instanceOfAndIn(node);
                    andRest(node);
                    self.ast.append(node, parent);
                }
            }

            function instanceOfAndIn(parent) {
                const node = self.ast.append(new Node('INSTANCEOF_AND_IN', 'NON_TERM'), parent);
                compare(node);
                instanceOfAndInRest(node)
            }

            function instanceOfAndInRest(parent) {
                const node = new Node('INSTANCEOF_AND_IN_REST', 'NON_TERM');
                const token = self.matchToken(/instanceof|in/, node, true);
                if (token) {
                    if (token.token === 'instanceof') {
                        lVal(node);
                    }
                    else {
                        if (tokens[self.current].token === '{') {
                            object(node);
                        }
                        else {
                            lVal(node);
                        }
                    }
                    self.ast.append(node, parent);
                }
            }

            function compare(parent) {
                const node = self.ast.append(new Node('COMPARE', 'NON_TERM'), parent);
                plusOrMinus(node);
                compareRest(node);
            }

            function compareRest(parent) {
                const node = new Node('COMPARE_REST', 'NON_TERM');
                if (self.matchToken(/>|>=|<|<=|===|!==|!=|==/, node, true)) {
                    plusOrMinus(node);
                    compareRest(node);
                    self.ast.append(node, parent);
                }
            }

            function plusOrMinus(parent) {
                const node = self.ast.append(new Node('PLUS_MINUS', 'NON_TERM'), parent);
                multiOrDiv(node);
                plusOrMinusRest(node);
            }

            function plusOrMinusRest(parent) {
                const node = new Node('PLUS_MINUS_REST', 'NON_TERM');
                if (self.matchToken(/^(\+|\-)$/, node, true)) {
                    multiOrDiv(node);
                    plusOrMinusRest(node);
                    self.ast.append(node, parent);
                }
            }

            function multiOrDiv(parent) {
                const node = self.ast.append(new Node('MULTI_DIV', 'NON_TERM'), parent);
                factor(node);
                multiOrDivRest(node);
            }

            function multiOrDivRest(parent) {
                const node = new Node('MULTI_DIV_REST', 'NON_TERM');
                if (self.matchToken(/^(\*|\/|%)$/, node, true)) {
                    factor(node);
                    multiOrDivRest(node);
                    self.ast.append(node, parent);
                }
            }

            function factor(parent) {
                const node = self.ast.append(new Node('FACTOR', 'NON_TERM'), parent);
                const currentToken = tokens[self.current],
                    type = currentToken.type,
                    token = currentToken.token;

                if (type.match(/string|number|bool|undefined|null/)) {
                    self.matchType(/string|number|bool|undefined|null/, node);
                }
                else if (type.match(/id/)) {
                    lVal(node);
                    if (self.matchToken(/\+\+|\-\-/, node, true)) {
                        node.token = 'SELF_PLUS_MINUS_BACKWARDS';
                    }
                }
                else if (token.match(/\+\+|\-\-/)) {
                    selfPlusOrMinus(node);
                }
                else if (token.match(/!/)) {
                    self.matchToken(/!/, node);
                    factor(node);
                }
                else if (token.match(/\{/)) {
                    object(node);
                }
                else if (token.match(/\[/)) {
                    array(node);
                }
                else if (token.match(/\(/)) {
                    self.matchToken(/\(/, node);
                    expr(node, self.current);
                    self.matchToken(/\)/, node);
                    if (self.matchToken(/\+\+|\-\-/, node, true)) {
                        node.token = 'SELF_PLUS_MINUS_BACKWARDS';
                    }
                }
                else if (token.match(/\-/)) {
                    self.matchToken(/\-/, node);
                    factor(node);
                }
                else if (token.match(/void/)) {
                    self.matchToken(/void/, node);
                    factor(node);
                }
                else if (token.match(/delete/)) {
                    self.matchToken(/delete/, node);
                    lVal(node);
                }
                else if (token.match(/typeof/)) {
                    self.matchToken(/typeof/, node);
                    factor(node);
                }
                else if (token.match(/~/)) {
                    self.matchToken(/~/, node);
                    factor(node);
                }
            }

            function selfPlusOrMinus(parent) {
                const node = self.ast.append(new Node('SELF_PLUS_MINUS', 'NON_TERM'), parent);
                self.matchToken(/\-\-|\+\+/, node);
                selfPlusOrMinusRest(node);
            }

            function selfPlusOrMinusRest(parent) {
                const node = new Node('SELF_PLUS_MINUS_REST', 'NON_TERM');
                if (self.matchToken(/\(/, node, true)) {
                    lVal(node);
                    self.matchToken(/\)/, node);
                }
                else {
                    lVal(node);
                }
                self.ast.append(node, parent);
            }

            function object(parent) {
                const node = self.ast.append(new Node('OBJECT', 'NON_TERM'), parent);
                self.matchToken(/\{/, node);
                objectContent(node);
                self.matchToken(/\}/, node);
            }

            function objectContent(parent) {
                const node = new Node('OBJECT_CONTENT', 'NON_TERM');
                if (self.matchType(/id|string|number/, node, true)) {
                    self.matchToken(/:/, node);
                    expr(node, self.current);
                    self.ast.append(node, parent);
                    if (self.matchToken(/\,/, node, true)) {
                        objectContent(node);
                    }
                }
            }

            function array(parent) {
                const node = self.ast.append(new Node('ARRAY', 'NON_TERM'), parent);
                self.matchToken(/\[/, node, true);
                arrayContent(node);
                self.matchToken(/\]/, node, true);
            }

            function arrayContent(parent) {
                const node = self.ast.append(new Node('ARRAY_CONTENT', 'NON_TERM'), parent);
                expr(node, self.current);
                if (self.matchToken(/\,/, node, true)) {
                    arrayContent(node);
                }
            }

            expr(node, 0);
        }

        expression(self.tokens, self.ast.root);
        return self.ast.root;
    }
}

class Expression extends Parser {
    constructor(ast, tokens) {
        super(ast, tokens);
    }

    parse() {
        function findCommaPosition(restTokens) {
            return restTokens.findIndex(t=>t.token === ',');
        }

        const node = new Node('COMMA', 'NON_TERM');
        const tokens = this.tokens;
        this.ast.root = node;

        let commaPos = findCommaPosition(tokens) !== -1 ?
                findCommaPosition(tokens) : tokens.length, restTokens = tokens,
            tokensToBeParsed = restTokens.slice(0, commaPos);

        while (commaPos !== -1) {
            this.ast.append(new _Expression(new AST(node), tokensToBeParsed).parse(), node);
            restTokens = commaPos < restTokens.length ? restTokens.slice(commaPos + 1) : [];
            commaPos = findCommaPosition(restTokens);
            tokensToBeParsed = commaPos !== -1 ? restTokens.slice(0, commaPos) : restTokens;
        }

        let ret = new _Expression(new AST(node), tokensToBeParsed);
        if (ret.ast.root) {
            this.ast.append(ret.ast.root, node);
        }
        return this.ast.root;
    }
}

class JSParser extends Parser {
    constructor(ast, tokens) {
        super(ast, tokens);
    }

    parseExpr(node, parent, tokens) {
        if (!node) {
            node = new Node('EXPR', 'NON_TERM');
        }
        this.ast.append(new _Expression(new AST(node), tokens).parse(), parent);
        this.current += tokens.length;
    }

    parseExprUntil(node, parent, until) {
        const tokens = this.getTokensUntil(until);
        console.log(tokens);
        this.parseExpr(node, parent, tokens);
    }

    parseExprStmt(node, parent) {
        const tokens = this.getTokensUntil(';');
        if (!node) {
            node = new Node('EXPR_STMT', 'NON_TERM');
        }
        this.ast.append(new Expression(new AST(node), tokens).parse(), parent);
        this.current += tokens.length;
    }

    parse() {
        const self = this;

        function stmts(parent) {
            if (self.current < self.tokens.length) {
                const node = new Node('STMTS', 'NON_TERM');
                const cur = self.currentToken();
                if (cur) {
                    if (cur.token === '{') {
                        block(node);
                        stmts(node);
                    }
                    else if (cur.token === '}') {
                        return;
                    }
                    else {
                        stmt(node);
                        self.matchToken(/;/, node, true);
                        stmts(node);
                    }
                    self.ast.append(node, parent);
                }
            }
        }

        function block(parent) {
            const node = new Node('BLOCK', 'NON_TERM');
            self.matchToken(/{/, node);
            stmts(node);
            self.matchToken(/}/, node);
            self.ast.append(node, parent);
        }

        function stmt(parent) {
            const node = new Node('STMT', 'NON_TERM');
            const nextT = self.nextToken();
            switch (self.currentToken().token) {
                case 'var':
                    _var(node);
                    break;
                case '(':
                    if (nextT.token === 'function') {
                        _function(node);
                        break;
                    }
                case 'if':
                    _if(node);
                    break;
                case 'for':
                    _for(node);
                    break;
                case ';':
                    self.matchToken(/;/, node);
                    break;
                case '}':
                    break;
                case 'while':
                    _while(node);
                    break;
                case 'function':
                    _function(node);
                    break;
                case 'do':
                    doWhile(node);
                    break;
                default:
                    self.parseExprStmt(null, node, ';');
                    break;
            }
            self.ast.append(node, parent);
        }

        function _var(parent) {
            const node = new Node('VAR', 'NON_TERM');
            self.matchToken(/var/, node);
            varBody(node);
            self.ast.append(node, parent);
        }

        function varBody(parent) {
            const node = new Node('VAR_BODY', 'NON_TERM');
            self.matchType(/id/, node);
            if (self.matchToken(/=/, node, true)) {
                varBodyRight(node);
                varBodyRest(node);
            }
            else {
                varBodyRest(node);
            }
            self.ast.append(node, parent);
        }

        function varBodyRight(parent) {
            const node = new Node('VAR_BODY_RIGHT', 'NON_TERM');
            const t = self.currentToken();
            if (t.token === 'function') {
                _function(node)
            }
            else {
                self.parseExprUntil(node, parent, /,|;/);
                varBodyRest(node);
            }
            self.ast.append(node, parent);
        }

        function varBodyRest(parent) {
            const node = new Node('VAR_BODY_REST', 'NON_TERM');
            if (self.matchToken(/,/, node, true)) {
                varBody(node);
                self.ast.append(node, parent);
            }
        }

        function _if(parent) {
            const node = new Node('IF', 'NON_TERM');
            self.matchToken(/if/, node);

            self.matchToken(/\(/, node);
            self.parseExprUntil(new Node('CONDITION', 'NON_TERM'), node, /\)/);
            self.matchToken(/\)/, node);

            controlBlock(node);
            _ifRest(node);
            self.ast.append(node, parent);
        }

        function controlBlock(parent) {
            const node = new Node('CONTROL_BLOCK', 'NON_TERM');
            const t = self.currentToken();
            if (t.token === '{') {
                block(node);
            }
            else {
                stmt(node);
            }
            self.ast.append(node, parent);
        }

        function _ifRest(parent) {
            const node = new Node('ELSE', 'NON_TERM');
            if (self.matchToken(/else/, node, true)) {
                controlBlock(node);
                self.ast.append(node, parent);
            }
        }

        function _for(parent) {
            const node = new Node('FOR', 'NON_TERM');
            self.matchToken(/for/, node);
            self.matchToken(/\(/, node);
            controlHandle(node);
            self.matchToken(/\)/, node);
            controlBlock(node);
            self.ast.append(node, parent);
        }

        function controlHandle(parent) {
            const node = new Node('FOR_CONTROL', 'NON_TERM');
            const currentT = self.currentToken();
            const nextT = self.nextToken();
            const thirdT = self.nthToken(2);
            if (nextT.token === 'in' || thirdT.token === 'in') {
                if (currentT.token === 'var') {
                    _var(node);
                }
                else {
                    self.matchType(/id/, node);
                }
                self.matchToken(/in/, node);
                self.parseExprUntil(new Node('IN_TARGET'), node, ')');
            }
            else {
                if (currentT.token === 'var') {
                    forInit(node);
                    self.matchToken(/;/, node);
                    self.parseExprUntil(null, node, ';');
                    self.matchToken(/;/, node);
                    self.parseExprUntil(null, node, /\)/);
                }
            }

            self.ast.append(node, parent);
        }

        function forInit(parent) {
            const node = new Node('FOR_INIT', 'NON_TERM');
            const t = self.currentToken();
            if (t.token === 'var') {
                _var(node);
            }
            else {
                self.parseExprUntil(null, node, ';');
            }
            self.ast.append(node, parent);
        }

        function _while(parent) {
            const node = new Node('WHILE', 'NON_TERM');
            self.matchToken(/while/, node);
            self.matchToken(/\(/, node);
            self.parseExprUntil(null, node, /\)/);
            self.matchToken(/\)/, node);
            controlBlock(node);
            self.ast.append(node, parent);
        }

        function doWhile(parent) {
            const node = new Node('DO_WHILE', 'NON_TERM');
            self.matchToken(/do/, node);
            controlBlock(node);
            self.matchToken(/while/, node);
            self.matchToken(/\(/, node);
            self.parseExprUntil(null, node, /\)/);
            self.matchToken(/\)/, node);
            self.ast.append(node, parent);
        }

        function _function(parent) {
            const node = new Node('FUNCTION', 'NON_TERM');
            const brackteMatched = self.matchToken(/\(/, node, true);
            self.matchToken(/function/, node);
            self.matchType(/id/, node, true);
            _arguments(node);
            block(node);
            if (brackteMatched) {
                self.matchToken(/\)/, node);
            }
            self.ast.append(node, parent);
        }

        function _arguments(parent) {
            const node = new Node('ARGUMENTS', 'NON_TERM');
            self.matchToken(/\(/, node);
            argList(node);
            self.matchToken(/\)/, node);
            self.ast.append(node, parent);
        }

        function argList(parent) {
            const node = new Node('ARG_LIST', 'NON_TERM');
            if (self.matchType(/id/, node, true)) {
                argListRest(node);
                self.ast.append(node, parent);
            }
        }

        function argListRest(parent) {
            const node = new Node('ARG_LIST_REST', 'NON_TERM');
            if (self.matchToken(/,/, node, true)) {
                self.matchType(/id/, node);
                argListRest(node);
                self.ast.append(node, parent);
            }
        }

        this.ast.root = new Node('STMTS', 'NON_TERM');
        stmts(this.ast.root);
        return this.ast;
    }
}

module.exports = function (tokens) {
    const ast = new JSParser(new AST(new Node('PROGRAM', 'NON_TERM')), tokens).parse();
    ast.flatten();
    ast.clear();
    return ast.root;
};
