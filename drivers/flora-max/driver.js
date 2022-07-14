'use strict';

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

module.exports = class MiFloraSensorDriver extends MiFloraDriver {

  getMiFloraBleIdentification() {
    return 'Grow care garden';
  }

  getMiFloraBleName() {
    return 'Mi flora garden care max';
  }

  getDefaultSettings() {
    return {
      measure_temperature_min: 16,
      measure_temperature_max: 25,
      measure_nutrition_min: 300,
      measure_nutrition_max: 1000,
      measure_moisture_min: 15,
      measure_moisture_max: 30,
      measure_luminance_min: 1000,
      measure_luminance_max: 2000,
    };
  }

  getSupportedCapabilities() {
    return [
      'measure_temperature',
      'measure_luminance',
      'measure_nutrition',
      'measure_moisture',
      'measure_battery',
    ];
  }

};
