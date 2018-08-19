'use strict';

const Homey = require('homey');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;

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

                        let minValue = args.device.getSetting(this._thresholdMapping[capability].min);
                        let maxValue = args.device.getSetting(this._thresholdMapping[capability].max);
                        let value = args.device.getCapabilityValue(capability);

                        console.log("%s < %s || %s > %s", value, minValue, value, maxValue);

                        return (value < minValue || value > maxValue);
                    });
            }
        }.bind(this));
    }

    buildHtmlCharts() {

        const device = this;
        const thresholdMapping = this._thresholdMapping;
        const conditionsMapping = this._conditionsMapping;
        let capabilities = this.getCapabilities();
        const dom = new JSDOM(`<!DOCTYPE html>`);
        const document = dom.window.document;
        const target = document.createElement("div");
        target.style.fontFamily = '"Roboto",Helvetica,sans-serif';

        let borderColor = '';
        let color = '';
        let colorGreen = '#d3fec4';
        let borderColorGreen = '#b3e0a2';
        let colorRed = '#ffd3cb';
        let borderColorRed = '#dd958f';
        let colorDefault = '#f4f4f4';
        let borderColorDefault = '#cccccc';

        let widthDefault = 200;
        let heightDefault = 20;

        let flowerTable = document;
        let td = document;
        let tr = document;
        let loader = document;
        let loaderTr = document;
        let loaderTd = document;
        let title = document;
        let trThreshold = document;
        let tdThreshold = document;

        flowerTable = document.createElement("table");
        flowerTable.cellPadding = 0;
        flowerTable.cellSpacing = 0;

        tr = document.createElement("tr");
        td = document.createElement("td");
        td.style.height = heightDefault + "px";
        td.colSpan = 5;
        title = document.createElement("span");
        title.style.fontSize = '2em';
        title.innerHTML = this.getName();
        td.appendChild(title);
        tr.appendChild(td);
        flowerTable.appendChild(tr);

        trThreshold = document.createElement("tr");
        for (let i = 1; i <= 4; i++) {
            // threshold tr
            tdThreshold = document.createElement("td");
            tdThreshold.style.height = "8px";
            if (i !== 1 && i !== 4) {
                tdThreshold.style.borderRight = '1px solid ' + borderColorDefault;
            }
            trThreshold.appendChild(tdThreshold);
        }
        flowerTable.appendChild(trThreshold.cloneNode(true));

        capabilities.forEach(function (capability) {
            if (conditionsMapping.hasOwnProperty(capability)) {

                const min = device.getSetting(thresholdMapping[capability].min);
                const max = device.getSetting(thresholdMapping[capability].max);
                const start = min - (max - min);
                const end = max + (max - min);

                let value = device.getCapabilityValue(capability);

                const parts = [
                    {
                        min: start,
                        max: min
                    },
                    {
                        min: min,
                        max: max
                    },
                    {
                        min: max,
                        max: end
                    }
                ];

                color = colorRed;
                borderColor = borderColorRed;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.min < value && part.max >= value && i === 1) {
                        color = colorGreen;
                        borderColor = borderColorGreen;
                    }
                }
                let loaderDone = false;

                tr = document.createElement("tr");
                td = document.createElement("td");
                td.style.height = heightDefault + "px";
                td.colspan = 5;
                td.style.width = "px";
                title = document.createElement("span");
                title.innerHTML = Homey.__('capability.' + capability + '.name');
                td.appendChild(title);
                tr.appendChild(td);

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];

                    td = document.createElement("td");
                    loader = document.createElement("table");
                    loader.cellPadding = 0;
                    loader.cellSpacing = 0;
                    loader.classList.add('loader');
                    loaderTr = document.createElement("tr");
                    loaderTd = document.createElement("td");
                    loaderTd.style.width = widthDefault + "px";
                    loaderTd.style.height = heightDefault + "px";

                    if (false === loaderDone) {
                        td.appendChild(loader);
                    }
                    loaderTd.style.backgroundColor = color;

                    const overflow = part.min < value && part.max <= value;
                    if (part.min < value && part.max >= value || overflow) {
                        if (overflow) {
                            value = part.max;
                        }
                        // min = 125
                        // max = 175
                        // value = 150
                        // length = 175 - 125 = 50;
                        // offset - 175 - 150 = 25;
                        // percent = 100 / (50 / 25) = 50%
                        // width = 300 / 100 * 50 = 150px
                        let length = part.max - part.min;
                        let offset = part.max - value;
                        let percent = 100 / (length / offset);
                        loaderTd.style.width = (widthDefault / 100 * percent) - 1 + "px";
                        loaderTd.style.borderRight = '1px solid ' + borderColor;
                        loaderTd.style.textAlign = 'right';
                        loaderDone = true;

                        title = document.createElement("span");
                        title.innerHTML = value + Homey.__('capability.' + capability + '.suffix');
                        title.style.lineHeight = heightDefault + "px";
                        title.style.color = '#000';
                        title.style.margin = '0 8px 0 0';
                        title.style.fontSize = '1em';
                        loaderTd.appendChild(title);
                    }
                    loaderTr.appendChild(loaderTd);
                    loader.appendChild(loaderTr);

                    td.style.backgroundColor = colorDefault;
                    td.style.width = widthDefault + "px";
                    td.style.height = heightDefault + "px";
                    if (i !== 2) {
                        td.style.width = widthDefault - 1 + "px";
                        td.style.borderRight = '1px solid ' + borderColorDefault;
                    }
                    tr.appendChild(td);
                }
                flowerTable.appendChild(tr);
            }
        });
        flowerTable.appendChild(trThreshold.cloneNode(true));
        target.appendChild(flowerTable);

        return target.innerHTML;
    }
}

module.exports = MiFloraDevice;