'use strict';

const MiFloraDriver = require('../../lib/MiFloraDriver.js');

module.exports = class MiFloraRopotDriver extends MiFloraDriver {

  getMiFloraBleIdentification() {
    return 'ropot';
  }

  getMiFloraBleName() {
    return 'Mi flora ropot';
  }

  getDefaultSettings() {
    return {
      measure_temperature_min: 16,
      measure_temperature_max: 25,
      measure_nutrition_min: 300,
      measure_nutrition_max: 1000,
      measure_moisture_min: 15,
      measure_moisture_max: 30,
    };
  }

  getSupportedCapabilities() {
    return [
      'measure_temperature',
      'measure_nutrition',
      'measure_moisture',
      'alarm_temperature',
      'alarm_nutrition',
      'alarm_moisture',
    ];
  }

};
