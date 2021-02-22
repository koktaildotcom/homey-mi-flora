'use strict';

const Homey = require('homey');

module.exports = class MiFloraDevice extends Homey.Device {

    /**
     * update the detected sensor values and emit the triggers
     *
     * @param capability
     * @param value
     */
    updateCapabilityValue(capability, value) {
        let currentValue = this.getCapabilityValue(capability);

        this.homey.app.globalSensorUpdated.trigger({
            'deviceName': this.getName(),
            'sensor': this.homey.__('capability.' + capability + '.name'),
            'report': this.homey.__('capability.' + capability + '.device_updated', {
                "value": value,
                "plant": this.getName()
            }),
            'value': '' + value
        })
            .then(function () {
                //console.log('Successful triggered flow card globalSensorUpdated global.');
            })
            .catch(function (error) {
                console.log('Cannot trigger flow card globalSensorUpdated global: %s.', error);
            });

        this.homey.app.globalSensorChanged.trigger({
            'deviceName': this.getName(),
            'sensor': this.homey.__('capability.' + capability + '.name'),
            'report': this.homey.__('capability.' + capability + '.device_changed', {
                "value": value,
                "plant": this.getName()
            }),
            'value': '' + value
        })
            .then(function () {
                //console.log('Successful triggered flow card globalSensorChanged.');
            })
            .catch(function (error) {
                console.error('Cannot trigger flow card globalSensorChanged device: %s.', error);
            });

        this._checkThresholdTrigger(capability, value);

        if (currentValue !== value) {
            this.setCapabilityValue(capability, value);

            this.homey.app.deviceSensorUpdated.trigger(this, {
                'sensor': this.homey.__('capability.' + capability + '.name'),
                'report': this.homey.__('capability.' + capability + '.device_updated', {
                    "value": value,
                    "plant": this.getName()
                }),
                'value': '' + value
            })
                .then(function () {
                    //console.log('Successful triggered flow deviceSensorUpdated sensor_changed.');
                })
                .catch(function (error) {
                    console.error('Cannot trigger flow card deviceSensorUpdated device: %s.', error);
                });

            this.homey.app.deviceSensorChanged.trigger(this, {
                'sensor': this.homey.__('capability.' + capability + '.name'),
                'report': this.homey.__('capability.' + capability + '.device_changed', {
                    "value": value,
                    "plant": this.getName()
                }),
                'value': '' + value
            })
                .then(function () {
                    //console.log('Successful triggered flow card deviceSensorChanged global.');
                })
                .catch(function (error) {
                    console.error('Cannot trigger flow card deviceSensorChanged global: %s.', error);
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
     * Update the device on add
     */
    onAdded() {
        this.homey.app.updateDevice(this);
    }

    /**
     * on settings change
     */
    async onSettings({oldSettings, newSettings, changedKeys}) {
        if(this.homey.app.thresholdMapping) {
            for (let capability in this.homey.app.thresholdMapping) {
                if (this.homey.app.thresholdMapping.hasOwnProperty(capability)) {
                    let mapping = this.homey.app.thresholdMapping[capability];
                    if (newSettings.hasOwnProperty(mapping.min) && newSettings.hasOwnProperty(mapping.max)) {
                        let minValue = newSettings[mapping.min];
                        let maxValue = newSettings[mapping.max];
                        if (minValue >= maxValue) {
                            return this.homey.__('settings.error.threshold', {"capability": this.homey.__('capability.' + capability + '.name')});
                        }
                    }
                }
            }
        }

        return null;
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
        if (this.homey.app.thresholdMapping && this.homey.app.thresholdMapping.hasOwnProperty(capability)) {
            let minValue = this.getSetting(this.homey.app.thresholdMapping[capability].min);
            let maxValue = this.getSetting(this.homey.app.thresholdMapping[capability].max);

            if (value < minValue) {
                let report = this.homey.__('capability.' + capability + '.threshold.min', {
                    "value": value,
                    "min": minValue,
                    "plant": this.getName()
                });

                this.homey.app.globalSensorOutsideThreshold.trigger({
                    'deviceName': this.getName(),
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card globalSensorOutsideThreshold.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
                    });

                this.homey.app.deviceSensorOutsideThreshold.trigger(this, {
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
                    });

                this.homey.app.globalSensorThresholdMinExceeds.trigger({
                    'deviceName': this.getName(),
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card globalSensorThresholdMinExceeds.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card globalSensorThresholdMinExceeds: %s.', error);
                    });

                this.homey.app.deviceSensorThresholdMinExceeds.trigger(this, {
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card deviceSensorThresholdMinExceeds.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card deviceSensorThresholdMinExceeds: %s.', error);
                    });
            }
            if (value > maxValue) {
                let report = this.homey.__('capability.' + capability + '.threshold.max', {
                    "value": value,
                    "max": maxValue,
                    "plant": this.getName()
                });

                this.homey.app.globalSensorOutsideThreshold.trigger({
                    'deviceName': this.getName(),
                    'report': report,
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card globalSensorOutsideThreshold.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
                    });

                this.homey.app.deviceSensorOutsideThreshold.trigger(this, {
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
                    });

                this.homey.app.globalSensorThresholdMaxExceeds.trigger({
                    'deviceName': this.getName(),
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card globalSensorThresholdMaxExceeds.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card globalSensorThresholdMaxExceeds: %s.', error);
                    });

                this.homey.app.deviceSensorThresholdMaxExceeds.trigger(this, {
                    'sensor': this.homey.__('capability.' + capability + '.name'),
                    'report': report,
                    'value': '' + value
                })
                    .then(function () {
                        //console.log('Successful triggered flow card deviceSensorThresholdMaxExceeds.');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card deviceSensorThresholdMaxExceeds: %s.', error);
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

        const defaultSettings = {
            "measure_temperature": {
                "min": 10,
                "max": 30,
            },
            "measure_luminance": {
                "min": 500,
                "max": 2000,
            },
            "flora_measure_fertility": {
                "min": 350,
                "max": 1500,
            },
            "flora_measure_moisture": {
                "min": 15,
                "max": 30,
            },
        };

        if(this.homey.app.thresholdMapping) {
		  for (let capability in this.homey.app.thresholdMapping) {
			if (this.homey.app.thresholdMapping.hasOwnProperty(capability) && defaultSettings.hasOwnProperty(capability)) {
			  let mapping = this.homey.app.thresholdMapping[capability];
			  let defaults = defaultSettings[capability];
			  if (this.getSetting(mapping.min) === '0') {
				const object = {};
				object[mapping.min] = defaults.min;
				this.setSettings(object);
			  }
			  if (this.getSetting(mapping.max) === '0') {
				const object = {};
				object[mapping.max] = defaults.max;
				this.setSettings(object);
			  }
			}
		  }
		}
    }
}
