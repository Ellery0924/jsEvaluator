'use strict';
const Node = require('./ParseTree').Node;

module.exports = class {
    constructor(ast, tokens) {
        this.ast = ast;
        this.current = 0;
        this.tokens = tokens;
    }

    currentTokenStr() {
        return this.currentToken() ? this.currentToken().token : null;
    }

    currentToken() {
        return this.nthToken(0);
    }

    nextToken() {
        return this.nthToken(1);
    }

    fallbackTo(index) {
        this.current = index;
    }

    nthToken(n) {
        return this.tokens[this.current + n] || null;
    }

    error(expection) {
        throw new Error('syntax error, parsing:' + JSON.stringify(this.tokens[this.current]) + ", expecting: " + expection);
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
            } else {
                if (optional) {
                    return false;
                } else {
                    this.error(token);
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
            } else {
                if (optional) {
                    return false;
                }
                this.error(type);
            }
        }
    }

    getTokensUntil(token) {
        const ret = [];
        for (let i = this.current; i < this.tokens.length; i++) {
            const t = this.tokens[i];
            if (!t.token.match(new RegExp(token))) {
                ret.push(t);
            } else {
                break;
            }
        }
        return ret;
    }
};
