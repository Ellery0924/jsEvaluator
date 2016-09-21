'use strict';

class Scope {
    constructor() {
        this.env = {};
        this.parent = null;
    }

    put(key, value) {
        this.env[key] = value;
    }

    setParent(parent) {
        this.parent = parent;
    }
}