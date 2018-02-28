'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {
    onInit() {
        console.log('device onInit!');
        this.setCapabilityValue("measure_temperature", 0);
        this.setCapabilityValue("measure_luminance", 0);
        this.setCapabilityValue("measure_humidity", 0);
        this.setCapabilityValue("measure_conductivity", 0);
    }
}

module.exports = MiFloraDevice;