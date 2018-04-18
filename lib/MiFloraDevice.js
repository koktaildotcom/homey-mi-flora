'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    updateCapabilityValue(capability, value) {
        let currentValue = this.getCapabilityValue(capability);

        this.globalSensorUpdated.trigger({
            'device': this.getName(),
            'sensor': Homey.__('capability.' + capability + '.name'),
            'report': Homey.__('capability.' + capability + '.device_updated', {
                "value": value,
                "plant": this.getName()
            }),
            'value': '' + value
        })
            .catch(function (error) {
                console.error('Cannot trigger flow card sensor_changed device: %s.', error);
            });

        this.deviceSensorUpdated.trigger(this, {
            'sensor': Homey.__('capability.' + capability + '.name'),
            'report': Homey.__('capability.' + capability + '.device_updated', {
                "value": value,
                "plant": this.getName()
            }),
            'value': '' + value
        })
            .catch(function (error) {
                console.error('Cannot trigger flow card sensor_changed global: %s.', error);
            });

        // force change if its the save value
        if (currentValue === value) {
            this.setCapabilityValue(capability, null);
            this.setCapabilityValue(capability, value);
        }
        else {
            this.setCapabilityValue(capability, value);

            this._checkThresholdTrigger(capability, value);

            this.globalSensorChanged.trigger({
                'device': this.getName(),
                'sensor': Homey.__('capability.' + capability + '.name'),
                'report': Homey.__('capability.' + capability + '.device_changed', {
                    "value": value,
                    "plant": this.getName()
                }),
                'value': '' + value
            })
                .catch(function (error) {
                    console.error('Cannot trigger flow card sensor_changed device: %s.', error);
                });

            this.deviceSensorChanged.trigger(this, {
                'sensor': Homey.__('capability.' + capability + '.name'),
                'report': Homey.__('capability.' + capability + '.device_changed', {
                    "value": value,
                    "plant": this.getName()
                }),
                'value': '' + value
            })
                .catch(function (error) {
                    console.error('Cannot trigger flow card sensor_changed global: %s.', error);
                });
        }
    }

    _checkThresholdTrigger(capability, value) {
        if (this._thresholdMapping.hasOwnProperty(capability)) {
            let minValue = this.getSetting(this._thresholdMapping[capability].min);
            let maxValue = this.getSetting(this._thresholdMapping[capability].max);

            if (value < minValue) {
                let report = Homey.__('capability.' + capability + '.threshold.min', {
                    "value": value,
                    "min": minValue,
                    "plant": this.getName()
                });
                this.globalSensorThresholdMinExceeds.trigger({
                    'device': this.getName(),
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_min_exceeds: %s.', error);
                    });
            }
            if (value > maxValue) {
                let report = Homey.__('capability.' + capability + '.threshold.max', {
                    "value": value,
                    "max": maxValue,
                    "plant": this.getName()
                });
                this.globalSensorThresholdMaxExceeds.trigger({
                    'device': this.getName(),
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_max_exceeds: %s.', error);
                    });
            }
        }
    }

    onInit() {
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
    }

    _registerTriggers() {

        this.deviceSensorUpdated = new Homey.FlowCardTriggerDevice('device_sensor_updated');
        this.deviceSensorUpdated.register();

        this.globalSensorUpdated = new Homey.FlowCardTrigger('sensor_updated');
        this.globalSensorUpdated.register();

        this.deviceSensorChanged = new Homey.FlowCardTriggerDevice('device_sensor_changed');
        this.deviceSensorChanged.register();

        this.globalSensorChanged = new Homey.FlowCardTrigger('sensor_changed');
        this.globalSensorChanged.register();

        this.globalSensorThresholdMinExceeds = new Homey.FlowCardTrigger('sensor_threshold_min_exceeds');
        this.globalSensorThresholdMinExceeds.register();

        this.globalSensorThresholdMaxExceeds = new Homey.FlowCardTrigger('sensor_threshold_max_exceeds');
        this.globalSensorThresholdMaxExceeds.register();

        let capabilities = this.getCapabilities();
        capabilities.forEach(function (capability) {
            if (this._conditionsMapping.hasOwnProperty(capability)) {
                new Homey.FlowCardCondition(this._conditionsMapping[capability])
                    .register()
                    .registerRunListener((args, state) => {

                        let minValue = args.device.getSetting(this._thresholdMapping[capability].min);
                        let maxValue = args.device.getSetting(this._thresholdMapping[capability].max);
                        let value = args.device.getCapabilityValue(capability);

                        console.log("%s < %s || %s > %s", value, minValue, value, maxValue);

                        return (value < minValue || value > maxValue);
                    });
            }
        }.bind(this));
    }
}

module.exports = MiFloraDevice;