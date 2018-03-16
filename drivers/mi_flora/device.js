'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    onInit() {

        let sensorChanged = new Homey.FlowCardTrigger('sensor_changed');
        sensorChanged.register();

        let deviceCapabilities = [
            "measure_temperature",
            "measure_luminance",
            "measure_conductivity",
            "measure_moisture",
            "measure_battery"
        ];

        this.registerMultipleCapabilityListener(deviceCapabilities, (valueObj, optsObj) => {

            if(valueObj.hasOwnProperty("measure_temperature")){
                console.log("measure_temperature changed: %s", valueObj.measure_temperature);
            }

            if(valueObj.hasOwnProperty("measure_luminance")){
                console.log("measure_luminance changed: %s", valueObj.measure_luminance);
            }

            if(valueObj.hasOwnProperty("measure_conductivity")){
                console.log("measure_conductivity changed: %s", valueObj.measure_conductivity);
            }

            if(valueObj.hasOwnProperty("measure_moisture")){
                console.log("measure_moisture changed: %s", valueObj.measure_moisture);
            }

            if(valueObj.hasOwnProperty("measure_battery")){
                console.log("measure_battery changed: %s", valueObj.measure_battery);
            }

            return Promise.resolve();
        }, 500);
    }

    onDelete() {
        clearInterval(this.getDriver().clearInterval());
    }
}

module.exports = MiFloraDevice;