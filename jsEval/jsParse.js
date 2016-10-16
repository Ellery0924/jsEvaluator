'use strict';
const Parser = require('./Parser');
const AST = require('./AST').AST;
const Node = require('./AST').Node;

class JSParser extends Parser {
    constructor(ast, tokens) {
        super(ast, tokens);
    }

    parse() {
        const self = this;
        const matchToken = this.matchToken.bind(this);
        const matchType = this.matchType.bind(this);
        const append = this.ast.append.bind(this.ast);

        function stmts(parent) {
            if (self.current < self.tokens.length) {
                const node = new Node('STMTS', 'NON_TERM');
                const t = self.currentToken();

                if (t.token === '{') {
                    block(node);
                }
                else {
                    stmt(node);
                    matchToken(/;/, node);
                    stmts(node);
                }
                append(node, parent);
            }
        }

        function block(parent) {
            const node = new Node('BLOCK', 'NON_TERM');
            matchToken(/\{/, node);
            stmts(node);
            matchToken(/\}/, node);
            append(node, parent);
        }

        function stmt(parent) {
            const node = new Node('STMT');
            const t = self.currentToken();
            switch (t.token) {
                case 'var':
                    _var(node);
                    break;
                default:
                    expression(node);
            }
            append(node, parent);
        }

        function _var(parent) {
            const node = new Node('VAR');
            matchToken(/var/, node);
            varBody(node);
            append(node, parent);
        }

        function varBody(parent) {
            const node = new Node('VAR_BODY');
            matchType(/id/, node);
            if (matchToken(/=/, node, true)) {
                varBodyRight(node);
            }
            varBodyRest(node);
            append(node, parent);
        }

        function varBodyRight(parent) {
            const node = new Node('VAR_BODY_RIGHT');
            threeItemOperation(node);
            append(node, parent);
        }

        function varBodyRest(parent) {
            const node = new Node('VAR_BODY_REST');
            if (matchToken(/,/, node, true)) {
                varBody(node);
                append(node, parent);
            }
        }

        function expression(parent) {
            const node = new Node('EXPR');
            comma(node);
            append(node, parent);
        }

        function comma(parent) {
            const node = new Node('COMMA');
            assign(node);
            commaRest(node);
            append(node, parent);
        }

        function commaRest(parent) {
            const node = new Node('COMMA_REST');
            if (matchToken(/,/, node, true)) {
                console.log('commarest')
                assign(node);
                commaRest(node);
                append(node, parent);
            }
        }

        function findFirstKeyTerm() {
            return self.getTokensUntil(',').find(token=>
                    token.token === '='
                    || token.token === '+='
                    || token.token === '-='
                    || token.token === '*='
                    || token.token === '/='
                    || token.token === '%='
                    || token.token === '?'
                ) || {token: 'others'};
        }

        const assignTerm = /=|\+=|-=|\/=|\*=|%=/;

        function assign(parent) {
            const node = new Node('ASSIGN');
            const firstKeyTerm = findFirstKeyTerm();

            if (firstKeyTerm.token.match(assignTerm)) {
                lVal(node);
                matchToken(assignTerm, node);
                assign(node);
            }
            else if (firstKeyTerm.token.match(/\?/)) {
                threeItemOperation(node);
            }
            else {
                or(node);
            }
            append(node, parent);
        }

        function lVal(parent) {
            const node = new Node('LVAL');
            matchType(/id/, node);
            lValRest(node);
            append(node, parent);
        }

        function lValRest(parent) {
            const node = new Node('LVAL_REST');
            if (matchToken(/\./, node, true)) {
                matchType(/id/, node);
                lValRest(node);
                append(node, parent);
            }
            else if (matchToken(/\[/, node, true)) {
                expression(node);
                matchToken(/\]/, node);
                lValRest(node);
                append(node, parent);
            }
        }

        function threeItemOperation(parent) {
            const node = new Node('THREE_ITEM_OPERATION');
            or(node);
            if (matchToken(/\?/, node, true)) {
                threeItemOperation(node);
                matchToken(/:/, node);
                threeItemOperation(node);
            }
            append(node, parent);
        }

        function or(parent) {
            const node = new Node('OR');
            and(node);
            orRest(node);
            append(node, parent);
        }

        function orRest(parent) {
            const node = new Node('OR_REST');
            if (matchToken(/\|\|/, node, true)) {
                and(node);
                orRest(node);
                append(node, parent);
            }
        }

        function and(parent) {
            const node = new Node('AND');
            instanceofOrIn(node);
            andRest(node);
            append(node, parent);
        }

        function andRest(parent) {
            const node = new Node('AND_REST');
            if (matchToken(/\&\&/, node, true)) {
                instanceofOrIn(node);
                andRest(node);
                append(node, parent);
            }
        }

        function instanceofOrIn(parent) {
            const node = new Node('INSTANCE_OF_OR_IN');
            compare(node);
            instanceofOrInRest(node);
            append(node, parent);
        }

        function instanceofOrInRest(parent) {
            const node = new Node('INSTANCE_OF_OR_IN_REST');
            if (matchToken(/instanceof|in/, node, true)) {
                compare(node);
                instanceofOrInRest(node);
                append(node, parent);
            }
        }

        function compare(parent) {
            const node = new Node('COMPARE');
            plusOrMinus(node);
            compareRest(node);
            append(node, parent);
        }

        function compareRest(parent) {
            const node = new Node('COMPARE_REST');
            const compareOperator = />|<|<=|>=|===|!==|==|!=/;
            if (matchToken(compareOperator, node, true)) {
                plusOrMinus(node);
                compareRest(node);
                append(node, parent);
            }
        }

        function plusOrMinus(parent) {
            const node = new Node('PLUS_OR_MINUS');
            multiOrDiv(node);
            plusOrMinusRest(node);
            append(node, parent);
        }

        function plusOrMinusRest(parent) {
            const node = new Node('PLUS_OR_MINUS_REST');
            if (matchToken(/\+|\-/, node, true)) {
                multiOrDiv(node);
                plusOrMinusRest(node);
                append(node, parent);
            }
        }

        function multiOrDiv(parent) {
            const node = new Node('MULTI_OR_DIV');
            factor(node);
            multiOrDivRest(node);
            append(node, parent);
        }

        function multiOrDivRest(parent) {
            const node = new Node('MULTI_OR_DIV_REST');
            if (matchToken(/\*|\//, node, true)) {
                factor(node);
                multiOrDivRest(node);
                append(node, parent);
            }
        }

        function factor(parent) {
            const node = append(new Node('FACTOR', 'NON_TERM'), parent);
            const currentToken = self.currentToken(),
                type = currentToken.type,
                token = currentToken.token;

            if (type.match(/string|number|bool|undefined|null/)) {
                matchType(/string|number|bool|undefined|null/, node);
            }
            else if (type.match(/id/)) {
                matchType(/id/, node);
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
