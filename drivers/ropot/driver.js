"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

class MiFloraRopotDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'ropot';
    }

    getMiFloraBleName() {
        return 'Mi Flora Ropot';
    }

    getSupportedCapabilities() {
        return [
            "measure_temperature",
            "flora_measure_fertility",
            "flora_measure_moisture"
        ];
    }
}

module.exports = MiFloraRopotDriver;
