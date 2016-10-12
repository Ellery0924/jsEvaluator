'use strict';
const Node = require('./AST').Node;

module.exports = class {
    constructor(ast, tokens) {
        this.ast = ast;
        this.current = 0;
        this.tokens = tokens;
    }

    currentToken() {
        return this.tokens[this.current];
    }

    error() {
        throw new Error('syntax error, parsing:' + JSON.stringify(this.tokens[this.current]));
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
                console.log('JSParser: token matched \'' + currentToken.token + '\'');
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
                console.log('JSParser: token matched \'' + currentToken.token + '\'');
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

    getTokensUntil(token) {
        const ret = [];
        for (let i = this.current; i < this.tokens.length; i++) {
            const t = this.tokens[i];
            if (t.token !== token) {
                ret.push(t);
            }
            else {
                break;
            }
        }
        return ret;
    }
};
