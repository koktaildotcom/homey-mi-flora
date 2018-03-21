'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    onInit() {

        let sensorChanged = new Homey.FlowCardTrigger('sensor_changed');
        sensorChanged.register();

        let deviceSensorChanged = new Homey.FlowCardTriggerDevice('device_sensor_changed');
        deviceSensorChanged.register();

        let deviceCapabilities = [
            "measure_temperature",
            "measure_luminance",
            "measure_conductivity",
            "measure_moisture",
            "measure_battery"
        ];

        this.registerMultipleCapabilityListener(deviceCapabilities, (valueObj, optsObj) => {
            let device = this;
            deviceCapabilities.forEach(function (capability) {
                if (valueObj.hasOwnProperty(capability)) {
                    console.log(capability + " changed: %s", valueObj[capability]);

                    sensorChanged.trigger({
                        'device': device.getName(),
                        'sensor': capability,
                        'value': '' + valueObj[capability]
                    })
                        .catch(function (error) {
                            console.error('Cannot trigger flow card sensor_changed: %s.', error);
                        });

                    deviceSensorChanged.trigger(device, {
                        'sensor': capability,
                        'value': '' + valueObj[capability]
                    })
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