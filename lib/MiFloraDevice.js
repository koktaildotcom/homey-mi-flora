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

    /**
     * @private
     *
     * @param document
     * @param deviceDisplay
     *
     * @return string
     *
     */
    _generateHtml(document, deviceDisplay) {

        let borderColor = '';
        let color = '';
        let colorBackgroundColor = '#f7f5f5';
        let colorGreen = '#d3fec4';
        let borderColorGreen = '#b3e0a2';
        let colorRed = '#ffd3cb';
        let borderColorRed = '#dd958f';
        let borderColorDefault = '#e6e6e6';
        let textColor = '#9c9c9c';
        let borderTable = '#c6c6c6';
        let textColorSecondary = '#c7c7c7';

        let widthDefault = 200;
        let heightDefault = 25;

        let flowerTable = document;
        let td = document;
        let tr = document;
        let loader = document;
        let loaderTr = document;
        let loaderTd = document;
        let title = document;

        const target = document.createElement("div");
        target.style.fontFamily = 'sans-serif';

        flowerTable = document.createElement("table");
        flowerTable.cellPadding = 0;
        flowerTable.cellSpacing = 0;

        tr = document.createElement("tr");
        td = document.createElement("td");
        td.style.height = heightDefault + "px";
        td.colSpan = 5;
        title = document.createElement("span");
        title.style.fontFamily = 'sans-serif';
        title.style.fontSize = '16px';
        title.style.color = textColor;
        title.innerHTML = deviceDisplay.name;
        td.appendChild(title);
        tr.appendChild(td);
        flowerTable.appendChild(tr);

        let trThreshold = document.createElement("tr");
        let tdThreshold = document;
        for (let i = 1; i <= 4; i++) {
            // threshold tr
            tdThreshold = document.createElement("td");
            tdThreshold.style.height = "6px";
            if (i === 2) {
                tdThreshold.style.borderLeft = '1px solid ' + borderTable;
            }
            trThreshold.appendChild(tdThreshold);
        }

        for (const capabilityName in deviceDisplay.capabilities) {

            const capability = deviceDisplay.capabilities[capabilityName];

            const min = capability.min;
            const max = capability.max;
            let value = capability.value;

            const start = min - (max - min);
            const end = max + (max - min);

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
                if (part.min <= value && part.max >= value && i === 1) {
                    color = colorGreen;
                    borderColor = borderColorGreen;
                }
            }
            let loaderDone = false;

            tr = document.createElement("tr");
            td = document.createElement("td");
            td.style.height = heightDefault + "px";
            td.colspan = 5;
            title = document.createElement("span");
            title.innerHTML = capability.sensor;
            title.style.margin = '0 5px 0 0';
            title.style.fontSize = '14px';
            title.style.fontFamily = 'sans-serif';
            title.style.color = textColor;
            td.appendChild(title);
            tr.appendChild(td);

            let trBuffer = document.createElement("tr");
            // add title
            let tdBuffer = document.createElement("td");
            trBuffer.appendChild(tdBuffer);

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                td = document.createElement("td");
                td.style.whiteSpace = 'nowrap';
                loader = document.createElement("table");
                loader.cellPadding = 0;
                loader.cellSpacing = 0;
                loader.classList.add('loader');
                loaderTr = document.createElement("tr");
                loaderTd = document.createElement("td");
                loaderTd.style.width = widthDefault + "px";
                loaderTd.style.height = heightDefault + "px";

                if (i === 0) {
                    td.style.borderLeft = '1px solid ' + borderTable;
                }

                loaderTd.style.backgroundColor = color;

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
                loaderTd.style.textAlign = 'right';

                title = document.createElement("span");
                //title.innerHTML = value + Homey.__('capability.' + capability + '.suffix');
                title.innerHTML = value + capability.suffix;
                title.style.lineHeight = heightDefault + "px";
                title.style.margin = '0 5px';
                title.style.fontSize = '12px';
                title.style.fontFamily = 'sans-serif';
                title.style.color = textColor;

                if (false === loaderDone) {
                    td.appendChild(loader);
                }

                // buffer tr
                let tdBuffer = document.createElement("td");
                tdBuffer.style.lineHeight = "15px";

                let thresholdValue = document.createElement("span");
                thresholdValue.style.lineHeight = "15px";
                thresholdValue.style.margin = '0 3px';
                thresholdValue.style.fontSize = '12px';
                thresholdValue.style.fontFamily = 'sans-serif';

                if (i === 0) {
                    tdBuffer.style.borderLeft = '1px solid ' + borderTable;
                }
                if (i === 0) {
                    tdBuffer.style.borderRight = '1px solid ' + borderColorDefault;
                    tdBuffer.style.textAlign = 'right';
                    thresholdValue.style.color = textColorSecondary;
                    thresholdValue.innerHTML = capability.min + capability.suffix;
                }
                if (i === 1) {
                    tdBuffer.style.borderRight = '1px solid ' + borderColorDefault;
                }
                if (i === 2) {
                    thresholdValue.style.color = textColorSecondary;
                    thresholdValue.innerHTML = capability.max + capability.suffix;
                    tdBuffer.style.textAlign = 'left';
                }

                tdBuffer.appendChild(thresholdValue);
                trBuffer.appendChild(tdBuffer);

                if (value <= part.min && i === 0) {
                    loaderTd.style.width = 0 + "px";
                    loaderTd.appendChild(title);
                    loaderTd.style.borderRight = '1px solid ' + borderColor;
                    loaderDone = true;
                }
                else if (part.min < value && part.max >= value) {
                    loaderTd.style.width = widthDefault - (widthDefault / 100 * percent) - 1 + "px";
                    loaderTd.appendChild(title);
                    loaderTd.style.borderRight = '1px solid ' + borderColor;
                    loaderDone = true;
                }
                else if (value > part.max && i === 2) {
                    loaderTd.style.width = widthDefault + "px";
                    loaderTd.appendChild(title);
                    loaderTd.style.borderRight = '1px solid ' + borderColor;
                    loaderDone = true;
                }
                loaderTr.appendChild(loaderTd);
                loader.appendChild(loaderTr);

                // min / max threshold
                td.style.backgroundColor = colorBackgroundColor;
                td.style.width = widthDefault + "px";
                td.style.height = heightDefault + "px";
                if (i !== 2) {
                    td.style.width = widthDefault - 1 + "px";
                    td.style.borderRight = '1px solid ' + borderColorDefault;
                }
                tr.appendChild(td);
            }

            flowerTable.appendChild(trThreshold.cloneNode(true));
            flowerTable.appendChild(trBuffer);
            flowerTable.appendChild(tr);
        }

        flowerTable.appendChild(trThreshold.cloneNode(true));

        tr = document.createElement("tr");
        td = document.createElement("td");
        tr.appendChild(td);
        td = document.createElement("td");
        td.style.borderBottom = '1px solid ' + borderTable;
        td.colSpan = 4;
        tr.appendChild(td);
        flowerTable.appendChild(tr);

        target.appendChild(flowerTable);
        target.style.backgroundColor = '#fbfbfb';

        return target.innerHTML;
    }

    /**
     * @return string
     */
    buildHtmlChart() {
        let deviceCapabilities = {};
        this.getCapabilities().forEach(function (capability) {
            if (this._conditionsMapping.hasOwnProperty(capability)) {
                deviceCapabilities[capability] = {
                    'sensor': Homey.__('capability.' + capability + '.name'),
                    'min': this.getSetting(this._thresholdMapping[capability].min),
                    'max': this.getSetting(this._thresholdMapping[capability].max),
                    'value': this.getCapabilityValue(capability),
                    'suffix': Homey.__('capability.' + capability + '.suffix')
                }
            }
        }.bind(this));

        const deviceDisplay = {
            'name': this.getName(),
            'capabilities': deviceCapabilities
        };

        const dom = new JSDOM(`<!DOCTYPE html>`);
        const document = dom.window.document;

        return this._generateHtml(document, deviceDisplay);
    }
}

module.exports = MiFloraDevice;