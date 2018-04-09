'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    _checkThresholdTrigger(capability, value) {

        if (this._thresholdMapping.hasOwnProperty(capability)) {
            let minValue = this.getSetting(this._thresholdMapping[capability].min);
            let maxValue = this.getSetting(this._thresholdMapping[capability].max);

            if (value < minValue) {
                this.deviceSensorThresholdMinExceeds.trigger({
                    'device': this.getName(),
                    'sensor': capability,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_min_exceeds: %s.', error);
                    });
            }
            if (value > maxValue) {

                //console.log(capability + " exceeds max: %s > %s", maxValue, value);

                this.deviceSensorThresholdMaxExceeds.trigger({
                    'device': this.getName(),
                    'sensor': capability,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_max_exceeds: %s.', error);
                    });
            }
        }
    }

    onInit() {

        this._deviceCapabilities = [
            "measure_temperature",
            "measure_luminance",
            "measure_conductivity",
            "measure_moisture",
            "measure_battery"
        ];

        this._conditionsMapping = {
            "measure_temperature": "measure_temperature_threshold",
            "measure_luminance": "measure_luminance_threshold",
            "measure_conductivity": "measure_conductivity_threshold",
            "measure_moisture": "measure_moisture_threshold"
        };

        this._thresholdMapping = {
            "measure_temperature": {
                "min": "measure_temperature_min",
                "max": "measure_temperature_max"
            },
            "measure_luminance": {
                "min": "measure_luminance_min",
                "max": "measure_luminance_max"
            },
            "measure_conductivity": {
                "min": "measure_conductivity_min",
                "max": "measure_conductivity_max"
            },
            "measure_moisture": {
                "min": "measure_moisture_min",
                "max": "measure_moisture_max"
            },
        };

        this._registerTriggers();

        this.registerMultipleCapabilityListener(this._deviceCapabilities, (valueObj, optsObj) => {
            this._deviceCapabilities.forEach(function (capability) {
                if (valueObj.hasOwnProperty(capability)) {
                    //console.log(capability + " changed: %s", valueObj[capability]);

                    this._checkThresholdTrigger(capability, valueObj[capability]);

                    this.sensorChanged.trigger({
                        'device': this.getName(),
                        'sensor': capability,
                        'value': '' + valueObj[capability]
                    })
                        .catch(function (error) {
                            console.error('Cannot trigger flow card sensor_changed device: %s.', error);
                        });

                    this.deviceSensorChanged.trigger(this, {
                        'sensor': capability,
                        'value': '' + valueObj[capability]
                    })
                        .catch(function (error) {
                            console.error('Cannot trigger flow card sensor_changed global: %s.', error);
                        });
                }
            }.bind(this));

            return Promise.resolve();
        }, 500);
    }

    _registerTriggers() {
        this.sensorChanged = new Homey.FlowCardTrigger('sensor_changed');
        this.sensorChanged.register();

        this.deviceSensorThresholdMinExceeds = new Homey.FlowCardTrigger('sensor_threshold_min_exceeds');
        this.deviceSensorThresholdMinExceeds.register();

        this.deviceSensorThresholdMaxExceeds = new Homey.FlowCardTrigger('sensor_threshold_max_exceeds');
        this.deviceSensorThresholdMaxExceeds.register();

        this.deviceSensorChanged = new Homey.FlowCardTriggerDevice('device_sensor_changed');
        this.deviceSensorChanged.register();

        this._deviceCapabilities.forEach(function (capability) {
            if (this._conditionsMapping.hasOwnProperty(capability)) {
                new Homey.FlowCardCondition(this._conditionsMapping[capability])
                    .register()
                    .registerRunListener((args, state) => {

                        let minValue = args.device.getSetting(this._thresholdMapping[capability].min);
                        let maxValue = args.device.getSetting(this._thresholdMapping[capability].max);
                        let value = args.device.getCapabilityValue(capability);

                        console.log("%s < %s || %s > %s", value , minValue , value, maxValue);

                        return (value < minValue || value > maxValue);
                    });
            }
        }.bind(this));
    }
}

module.exports = MiFloraDevice;