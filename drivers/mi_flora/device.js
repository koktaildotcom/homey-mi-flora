'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {
    onInit() {
        console.log('device onInit!');
        this.setCapabilityValue("measure_temperature", 2);
        this.setCapabilityValue("measure_luminance", 2);
        this.setCapabilityValue("measure_humidity", 2);
        this.setCapabilityValue("measure_conductivity", 2);
    }
}

module.exports = MiFloraDevice;