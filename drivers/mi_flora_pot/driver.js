"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

class MiFloraSensorDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'Flower care pot';
    }

    getMiFloraBleName() {
        return 'Mi Flora Ropot';
    }
}

module.exports = MiFloraSensorDriver;