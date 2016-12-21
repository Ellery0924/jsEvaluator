'use strict';

module.exports = {
    ParseTree: class {
        constructor(parent) {
            this.root = null;
            this.parent = parent || null;
        }

        append(node, target) {
            if (this.root === null) {
                this.root = node;
            } else {
                target.children.push(node);
                node.parent = target;
            }
            return node;
        }

        flatten(node) {
            if (!node) {
                node = this.root;
            }
            if (node.children.length === 1
                // 单节点语句不清理
                && node.token.match(/BREAK|CONTINUE|RETURN/) === null) {
                const onlyChild = node.children[0];
                if (!node.parent) {
                    this.root = onlyChild;
                    onlyChild.parent = null;
                    this.flatten(onlyChild);
                } else {
                    const indexInParent = node.parent.children.indexOf(node);
                    node.parent.children.splice(indexInParent, 1, onlyChild);
                    onlyChild.parent = node.parent;
                    this.flatten(onlyChild);
                }
            } else {
                node.children.forEach(child => this.flatten(child));
            }
        }

        clear(node) {
            if (!node) {
                node = this.root;
            }

            if (node.children.length === 0) {
                delete node.children;
                if (node.type === 'NON_TERM') {
                    node.parent.children.splice(node.parent.children.indexOf(node), 1);
                }
            } else {
                node.children.forEach(child => {
                    this.clear(child)
                });
            }

            if (node.parent !== undefined) {
                delete node.parent;
            }

            delete node.nextSibling;
        }
    },
    Node: class {
        constructor(token, type) {
            if (!type) {
                type = 'NON_TERM';
            }
            this.token = token;
            this.type = type;
            this.children = [];
            this.parent = null;
        }

        nextSibling() {
            const indexInParent = this.parent.indexOf(this);
            if (indexInParent && indexInParent < this.parent.length - 1) {
                return this.parent[indexInParent + 1];
            }
        }
    }
};