"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

class MiFloraSensorDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'Flower care';
    }

    getMiFloraBleName() {
        return 'Mi Flora Sensor';
    }

    getSupportedCapabilities() {
        return [
            "measure_temperature",
            "measure_luminance",
            "flora_measure_fertility",
            "flora_measure_moisture",
            "measure_battery"
        ];
    }
}

module.exports = MiFloraSensorDriver;