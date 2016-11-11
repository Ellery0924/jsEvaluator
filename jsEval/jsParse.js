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
            if (self.current < self.tokens.length && self.currentToken().token !== '}') {
                const node = new Node('STMTS', 'NON_TERM');
                const t = self.currentToken();
                if (t.token === '{') {
                    block(node);
                }
                else {
                    stmt(node);
                    matchToken(/;/, node, true);
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
            const t = self.currentTokenStr();
            switch (t) {
                case 'var':
                    _var(node);
                    break;
                case '(':
                case 'function':
                case 'new':
                    factor(node);
                    break;
                case 'if':
                    _if(node);
                    break;
                case 'while':
                    _while(node);
                    break;
                case 'do':
                    _do(node);
                    break;
                case 'for':
                    _for(node);
                    break;
                case 'try':
                    tryCatchFinally(node);
                    break;
                case 'break':
                    _break(node);
                    break;
                case 'continue':
                    _continue(node);
                    break;
                case 'return':
                    _return(node);
                    break;
                case 'throw':
                    _throw(node);
                    break;
                default:
                    expression(node);
            }
            append(node, parent);
        }

        function _if(parent) {
            const node = new Node('IF');
            matchToken(/if/, node);
            matchToken(/\(/, node);
            expression(node, ')');
            matchToken(/\)/, node);
            block(node);
            _ifRest(node);
            append(node, parent);
        }

        function _ifRest(parent) {
            const node = new Node('IF_REST');
            if (matchToken(/else/, node, true)) {
                const t = self.currentTokenStr();
                if (t === 'if') {
                    _if(node);
                }
                else {
                    block(node);
                }
                append(node, parent);
            }
        }

        function _while(parent) {
            const node = new Node('WHILE');
            matchToken(/while/, node);
            matchToken(/\(/, node);
            expression(node);
            matchToken(/\)/, node);
            block(node);
            append(node, parent);
        }

        function _do(parent) {
            const node = new Node('DO');
            matchToken(/do/, node);
            block(node);
            matchToken(/while/, node);
            matchToken(/\(/, node);
            expression(node);
            matchToken(/\)/, node);
            append(node, parent);
        }

        function _for(parent) {
            const node = new Node('FOR');
            matchToken(/for/, node);
            matchToken(/\(/, node);
            controlHandle(node);
            matchToken(/\)/, node);
            block(node);
            append(node, parent);
        }

        function controlHandle(parent) {
            const node = new Node('CONTROL_HANDLE');
            stmt(node);
            matchToken(/;/, node);
            stmt(node);
            matchToken(/;/, node);
            stmt(node);
            append(node, parent);
        }

        function tryCatchFinally(parent) {
            const node = new Node('TRY');
            matchToken(/try/, node);
            block(node);
            tryCatchFinallyRest(node);
            append(node, parent);
        }

        function tryCatchFinallyRest(parent) {
            const node = new Node('TRY_CATCH_FINALLY_REST');
            if (matchToken(/catch/, node, true)) {
                matchToken(/\(/, node);
                matchType(/id/, node);
                matchType(/\)/, node);
                block(node);
                if (matchToken(/finally/, node, true)) {
                    block(node);
                }
                append(node, parent);
            }
        }

        function _break(parent) {
            const node = new Node('BREAK');
            matchToken(/break/, node);
            append(node, parent);
        }

        function _continue(parent) {
            const node = new Node('CONTINUE');
            matchToken(/continue/, node);
            append(node, parent);
        }

        function _return(parent) {
            const node = new Node('RETURN');
            matchToken(/return/, node);
            expression(node);
            append(node, parent);
        }

        function _throw(parent) {
            const node = new Node('THROW');
            matchToken(/throw/, node);
            expression(node);
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

        function expression(parent, until) {
            const node = new Node('EXPR');
            comma(node, until);
            append(node, parent);
        }

        function comma(parent, until) {
            const node = new Node('COMMA');
            assign(node, until);
            commaRest(node);
            append(node, parent);
        }

        function commaRest(parent) {
            const node = new Node('COMMA_REST');
            if (matchToken(/,/, node, true)) {
                assign(node);
                commaRest(node);
                append(node, parent);
            }
        }

        function findFirstKeyTerm(until) {
            let regex = /[;,\{\}\(]/;

            function predicate(token) {
                return token.token === '='
                    || token.token === '+='
                    || token.token === '-='
                    || token.token === '*='
                    || token.token === '/='
                    || token.token === '%='
                    || token.token === '?';
            }

            if (until) {
                const tokens = self.tokens;
                const leftMatch = until === ']' ? '[' : '(';
                let leftMatchCount = 1;
                let end = 0;

                for (let i = self.current; i < tokens.length; i++) {
                    const t = tokens[i];
                    if (t.token.match(regex)) {
                        end = i;
                        break;
                    }
                    if (t.token === leftMatch) {
                        leftMatchCount++;
                    }
                    else if (t.token === until) {
                        leftMatchCount--;
                        if (leftMatchCount === 0) {
                            end = i;
                            break;
                        }
                    }
                }

                return tokens.slice(self.current, end).find(predicate) || { token: 'others' };
            }
            return self.getTokensUntil(regex).find(predicate) || { token: 'others' };
        }

        const assignTerm = /=|\+=|-=|\/=|\*=|%=/;

        function assign(parent, until) {
            const node = new Node('ASSIGN');
            const firstKeyTerm = findFirstKeyTerm(until);

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
            console.log('lval')
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
                expression(node, ']');
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
            if (matchToken(/^(\+|\-)$/, node, true)) {
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
            if (matchToken(/\*|\/|%/, node, true)) {
                factor(node);
                multiOrDivRest(node);
                append(node, parent);
            }
        }

        function factor(parent) {
            const node = new Node('FACTOR', 'NON_TERM');
            const currentToken = self.currentToken(),
                type = currentToken && currentToken.type,
                token = currentToken && currentToken.token;

            if (token === ')') {
                matchToken(/\)/, node);
                return;
            }

            if (type.match(/string|number|bool|undefined|null/)) {
                matchType(/string|number|bool|undefined|null/, node);
                node.token = 'BASIC_TYPE';
            }
            else if (token === '(') {
                matchToken(/\(/, node);
                expression(node, ')');
                matchToken(/\)/, node);
            }
            else if (matchToken(/^(\-|\+|\~|\!)$/, node, true)) {
                factor(node);
            }
            else if (matchToken(/typeof/, node, true)) {
                factor(node);
            }
            else if (matchToken(/void/, node, true)) {
                factor(node);
            }
            else if (matchToken(/\+\+|\-\-/, node, true)) {
                lVal(node);
            }
            else if (matchToken(/delete/, node, true)) {
                lVal(node);
            }
            else if (token === 'new') {
                _new(node);
            }
            else if (type.match(/id/)) {
                access(node);
                if (matchToken(/\+\+|\-\-/, node, true)) {
                    node.token = 'SELF_PLUS_OR_MINUS_BACKWARD';
                }
            }
            else if (token === 'function') {
                _function(node);
                if (matchToken(/\(/, node, true)) {
                    callArgs(node);
                    matchToken(/\)/, node);
                }
            }
            else if (token === '{') {
                object(node);
            }
            else if (token === '[') {
                array(node);
            }

            append(node, parent);
        }

        function call(parent) {
            const node = new Node('CALL');
            if (matchToken(/\(/, node, true)) {
                callArgs(node);
                matchToken(/\)/, node);
                parent.token = 'EXPR_CALL';
                append(node, parent);
                if (self.currentTokenStr() === '(') {
                    call(node);
                }
            }
        }

        function access(parent) {
            const node = new Node('ACCESS');
            lVal(node);
            accessCall(node);
            if (matchToken(/\./, node, true)) {
                access(node);
            }
            else if (matchToken(/\[/, node, true)) {
                expression(node);
                matchToken(/]/, node);
                if (matchToken(/\./, node, true)) {
                    access(node);
                }
            }
            append(node, parent);
        }

        function accessCall(parent) {
            const node = new Node('ACCESS_CAL_ARGS');
            if (matchToken(/\(/, node, true)) {
                callArgs(node);
                matchToken(/\)/, node);
                append(node, parent);
                accessCall(parent);
                parent.token = 'ACCESS_CALL'
            }
        }

        function callArgs(parent) {
            const node = new Node('CALL_ARGS');
            let t = self.currentTokenStr();
            if (t !== ')') {
                assign(node);
                t = self.currentTokenStr();
                if (t !== ')' && t === ',') {
                    matchToken(/,/, node);
                    callArgs(node);
                }
                append(node, parent);
            }
        }

        function _function(parent) {
            const node = new Node('FUNCTION');
            matchToken(/function/, node);
            functionName(node);
            matchToken(/\(/, node);
            functionArgs(node);
            matchToken(/\)/, node);
            block(node);
            append(node, parent);
        }

        function functionName(parent) {
            const node = new Node('FUNCTION_NAME');
            if (matchType(/id/, node, true)) {
                append(node, parent);
            }
        }

        function functionArgs(parent) {
            const node = new Node('FUNCTION_ARGS');
            if (matchType(/id/, node, true)) {
                if (matchToken(/,/, node, true)) {
                    functionArgs(node);
                }
                append(node, parent);
            }
        }

        function _new(parent) {
            const node = new Node('NEW');
            matchToken(/new/, node);
            factor(node);
            append(node, parent);
        }

        function object(parent) {
            const node = new Node('OBJECT');
            matchToken(/\{/, node);
            objectContent(node);
            matchToken(/\}/, node);
            append(node, parent);
        }

        function objectContent(parent) {
            const node = new Node('OBJECT_CONTENT');
            if (matchType(/id|string|number/, node, true)) {
                matchToken(/:/, node);
                assign(node);
                if (matchToken(/,/, node, true)) {
                    objectContent(node);
                }
                append(node, parent);
            }
        }

        function array(parent) {
            const node = new Node('ARRAY');
            matchToken(/\[/, node);
            arrayContent(node);
            matchToken(/\]/, node);
            append(node, parent);
        }

        function arrayContent(parent) {
            const node = new Node('ARRAY_CONTENT');
            if (self.currentTokenStr() !== ']') {
                comma(node);
                append(node, parent);
            }
        }

        this.ast.root = new Node('PROGRAM', 'NON_TERM');
        stmts(this.ast.root);
        return this.ast;
    }
}

module.exports = function (tokens) {
    const ast = new JSParser(new AST(new Node('PROGRAM', 'NON_TERM')), tokens).parse();
    ast.flatten();
    ast.clear();
    return ast;
};
