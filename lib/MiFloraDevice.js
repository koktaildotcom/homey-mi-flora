'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    /**
     * update the detected sensor values and emit the triggers
     *
     * @param capability
     * @param value
     */
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
                console.error('Cannot trigger flow card sensor_changed global: %s.', error);
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
                console.error('Cannot trigger flow card sensor_changed device: %s.', error);
            });

        this._checkThresholdTrigger(capability, value);

        // force change if its the save value
        if (currentValue === value) {
            this.setCapabilityValue(capability, null);
            this.setCapabilityValue(capability, value);
        }
        else {
            this.setCapabilityValue(capability, value);

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

    /**
     * wrapper for make the app backwards compatible
     *
     * @return string
     */
    getAddress() {
        let data = this.getData();
        if (data.uuid) {
            return data.uuid;
        }
        if (data.address) {
            return data.address;
        }
    }

    /**
     * on settings change
     *
     * @param oldSettingsObj
     * @param newSettingsObj
     * @param changedKeysArr
     * @param callback
     */
    onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
        for (let capability in this._thresholdMapping) {
            if (this._thresholdMapping.hasOwnProperty(capability)) {
                let mapping = this._thresholdMapping[capability];
                if (newSettingsObj.hasOwnProperty(mapping.min) && newSettingsObj.hasOwnProperty(mapping.max)) {
                    let minValue = newSettingsObj[mapping.min];
                    let maxValue = newSettingsObj[mapping.max];
                    if (minValue >= maxValue) {
                        callback(Homey.__('settings.error.threshold', {"capability": Homey.__('capability.' + capability + '.name')}), true);
                    }
                }
            }
        }

        callback(null, true);
    }

    /**
     * @private
     *
     * emit the registered triggers
     *
     * @param capability
     * @param value
     */
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

                this.globalSensorOutsideThreshold.trigger({
                    'device': this.getName(),
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_min_exceeds: %s.', error);
                    });

                this.deviceSensorOutsideThreshold.trigger(true, {
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_min_exceeds: %s.', error);
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

                this.deviceSensorThresholdMinExceeds.trigger(this, {
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

                this.globalSensorOutsideThreshold.trigger({
                    'device': this.getName(),
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_max_exceeds: %s.', error);
                    });

                this.deviceSensorOutsideThreshold.trigger(this, {
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_threshold_max_exceeds: %s.', error);
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

                this.deviceSensorThresholdMaxExceeds.trigger(this, {
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

    /**
     * on init the device
     */
    onInit() {

        if (!this.hasCapability('measure_battery')) {
            this.setUnavailable("No battery capability, please repair device.");
        }

        const conditionsMapping = {};
        const thresholdMapping = {};
        const capabilities = this.getCapabilities();
        capabilities.forEach(function (capability) {
            if (capabilities.indexOf(capability) !== -1 && capability !== 'measure_battery') {
                conditionsMapping[capability] = capability + '_threshold';
                thresholdMapping[capability] = {
                    'min': capability + '_min',
                    'max': capability + '_max'
                }
            }
        });

        this._conditionsMapping = conditionsMapping;
        this._thresholdMapping = thresholdMapping;

        this._registerTriggers();
    }

    /**
     * @private
     *
     * register triggers to the device
     */
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

        this.deviceSensorThresholdMinExceeds = new Homey.FlowCardTrigger('device_sensor_threshold_min_exceeds');
        this.deviceSensorThresholdMinExceeds.register();


        this.globalSensorThresholdMaxExceeds = new Homey.FlowCardTrigger('sensor_threshold_max_exceeds');
        this.globalSensorThresholdMaxExceeds.register();

        this.deviceSensorThresholdMaxExceeds = new Homey.FlowCardTrigger('device_sensor_threshold_max_exceeds');
        this.deviceSensorThresholdMaxExceeds.register();


        this.globalSensorOutsideThreshold = new Homey.FlowCardTrigger('sensor_outside_threshold');
        this.globalSensorOutsideThreshold.register();

        this.deviceSensorOutsideThreshold = new Homey.FlowCardTrigger('device_sensor_outside_threshold');
        this.deviceSensorOutsideThreshold.register();

        let capabilities = this.getCapabilities();
        capabilities.forEach(function (capability) {
            if (this._conditionsMapping.hasOwnProperty(capability)) {
                new Homey.FlowCardCondition(this._conditionsMapping[capability])
                    .register()
                    .registerRunListener((args, state) => {
                        const target = args.device;
                        if (target) {
                            let minValue = args.device.getSetting(this._thresholdMapping[capability].min);
                            let maxValue = args.device.getSetting(this._thresholdMapping[capability].max);
                            let value = args.device.getCapabilityValue(capability);

                            console.log("%s < %s || %s > %s", value, minValue, value, maxValue);

                            return (value < minValue || value > maxValue);
                        }

                        console.log("No device is attached to the flow card condition");
                        console.log("dumping args:");
                        console.log(args);

                        return false;
                    });
            }
        }.bind(this));
    }
}

module.exports = MiFloraDevice;