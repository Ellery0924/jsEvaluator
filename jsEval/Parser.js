'use strict';
const Node = require('./AST').Node;

module.exports = class {
    constructor(ast, tokens) {
        this.ast = ast;
        this.current = 0;
        this.tokens = tokens;
    }

    error() {
        throw new Error('syntax error, parsing:' + this.tokens[this.current].token);
    }

    toNextPos() {
        this.current++;
    }

    matchToken(token, parent, optional) {
        const currentToken = this.tokens[this.current];
        if (this.current < this.tokens.length) {
            const m = currentToken.token.match(token);
            if (m) {
                this.toNextPos();
                this.ast.append(new Node(currentToken.token, currentToken.type), parent);
                return true;
            }
            else {
                if (optional) {
                    return false;
                }
                else {
                    this.error();
                }
            }
        }
    }

    matchType(type, parent, optional) {
        const currentToken = this.tokens[this.current];
        if (this.current < this.tokens.length) {
            const m = currentToken.type.match(type);
            if (m) {
                this.toNextPos();
                this.ast.append(new Node(currentToken.token, currentToken.type), parent);
                return true;
            }
            else {
                if (optional) {
                    return false;
                }
                this.error();
            }
        }
    }
};
