"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

module.exports = class MiFloraRopotDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'ropot';
    }

    getMiFloraBleName() {
        return 'Mi Flora Ropot';
    }

    getDefaultSettings() {
        return {
            measure_temperature_min: 16,
            measure_temperature_max: 25,
            flora_measure_fertility_min: 300,
            flora_measure_fertility_max: 1000,
            flora_measure_moisture_min: 15,
            flora_measure_moisture_max: 30,
        }
    }

    getSupportedCapabilities() {
        return [
            "measure_temperature",
            "flora_measure_fertility",
            "flora_measure_moisture"
        ];
    }
}

