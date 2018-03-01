'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {
    onInit() {
        this.settings = this.getSettings();

        let updateInterval = this.settings.updateInterval * 1000;

        this.updateDataInterval = setInterval(() => {
            this.updateData();
        }, updateInterval);
    }

    updateData() {
        console.log('device getData!');

        this.setCapabilityValue("measure_temperature", 0);
        this.setCapabilityValue("measure_luminance", 0);
        this.setCapabilityValue("measure_humidity", 0);
        this.setCapabilityValue("measure_conductivity", 0);
        this.setCapabilityValue("measure_battery", 100);
    }

    onDelete() {
        clearInterval(this.updateDataInterval);
    }
}

module.exports = MiFloraDevice;