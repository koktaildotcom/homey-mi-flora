"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

class MiFloraSensorDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'ropot';
    }

    getMiFloraBleName() {
        return 'Mi Flora Ropot';
    }

    getCapabilities() {
        return [
            "measure_temperature",
            "measure_conductivity",
            "measure_moisture",
            "measure_battery"
        ];
    }
}

module.exports = MiFloraSensorDriver;