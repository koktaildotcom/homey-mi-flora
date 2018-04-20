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
            "measure_conductivity",
            "measure_moisture",
            "measure_battery"
        ];
    }
}

module.exports = MiFloraRopotDriver;