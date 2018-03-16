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
            let deviceName = this.getName();
            deviceCapabilities.forEach(function(capability) {
                if(valueObj.hasOwnProperty(capability)){
                    console.log(capability + " changed: %s", valueObj[capability]);
                    let tokens = {
                        'device': deviceName,
                        'variable': capability,
                        'value': '' + valueObj[capability]
                    }
                    sensorChanged.trigger( tokens )
                        .catch(function (error) {
                            console.error('Cannot trigger flow card sensor_changed: %s.', error);
                        });
                }
            });

            return Promise.resolve();
        }, 500);
    }
}

module.exports = MiFloraDevice;