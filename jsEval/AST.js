'use strict';

module.exports = {
    AST: class {
        constructor(parent) {
            this.root = null;
            this.parent = parent || null;
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

        flatten(node) {
            if (!node) {
                node = this.root;
            }
            if (node.children.length === 1) {
                const onlyChild = node.children[0];
                if (!node.parent) {
                    this.root = onlyChild;
                    this.flatten(onlyChild);
                }
                else {
                    const indexInParent = node.parent.children.indexOf(node);
                    node.parent.children.splice(indexInParent, 1, onlyChild);
                    onlyChild.parent = node.parent;
                    this.flatten(onlyChild);
                }
            }
            else {
                node.children.forEach(child=>this.flatten(child));
            }
        }

        clear(node) {
            if (!node) {
                node = this.root;
            }
            if (node.parent !== undefined) {
                delete node.parent;
            }
            if (node.children.length === 0) {
                delete node.children;
            }
            else {
                node.children.forEach(child=>this.clear(child));
            }
        }
    },
    Node: class {
        constructor(token, type) {
            this.token = token;
            this.type = type;
            this.children = [];
            this.parent = null;
        }
    }
};