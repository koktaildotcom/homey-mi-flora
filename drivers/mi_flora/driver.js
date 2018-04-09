"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

class MiFloraSensorDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'Flower care';
    }

    getMiFloraBleName() {
        return 'Mi Flora Sensor';
    }
}

module.exports = MiFloraSensorDriver;