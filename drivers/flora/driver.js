"use strict";

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

module.exports = class MiFloraSensorDriver extends MiFloraDriver {
    getMiFloraBleIdentification() {
        return 'Flower care';
    }

    getMiFloraBleName() {
        return 'Mi Flora Sensor';
    }

    getDefaultSettings() {
        return {
            measure_temperature_min: 16,
            measure_temperature_max: 25,
            flora_measure_fertility_min: 300,
            flora_measure_fertility_max: 1000,
            flora_measure_moisture_min: 15,
            flora_measure_moisture_max: 30,
            measure_luminance_min: 1000,
            measure_luminance_max: 2000,
        }
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
