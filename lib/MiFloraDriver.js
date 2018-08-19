"use strict";

const Homey = require('homey');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;

const MAX_RETRIES = 3;

class MiFloraDriver extends Homey.Driver {

    /**
     * init the driver
     */
    onInit() {
        this.htmlReport = new Homey.FlowCardTrigger('html_report');
        this.htmlReport.register();

        if (false) {
            let interval = 1000 * 10;

            let scope = this;
            setTimeout(function () {
                let reportEvent = scope.htmlReport;
                let devices = scope.getDevices();
                const report = scope._buildHtmlReport(devices);
                console.log('sending report');
                let first = true;
                devices.forEach(function (device) {
                    if (first) {
                        reportEvent.trigger({
                            'device': device.getName(),
                            'html_report': report
                        });
                        first = false;
                    }
                });

            }, interval);
        }
        else {
            this._synchroniseSensorData();
        }
    }

    /**
     * @private
     *
     * start the synchronisation
     */
    _synchroniseSensorData() {
        let devices = this.getDevices();
        if (devices.length === 0) {
            this._setNewTimeout();
        }
        else {
            let updateDevicesTime = new Date();
            let reportEvent = this.htmlReport;
            let scope = this;
            this._updateDevices(devices)
                .then(device => {
                    console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');

                    console.log('sending report');
                    let first = true;
                    const report = scope._buildHtmlReport(this.getDevices());
                    this.getDevices().forEach(function (device) {
                        if (first) {
                            reportEvent.trigger({
                                'device': device.getName(),
                                'html_report': report
                            });
                            first = false;
                        }
                    });

                    this._setNewTimeout();
                })
                .catch(error => {
                    this._setNewTimeout();
                    throw new Error(error);
                });
        }
    }

    /**
     * @private
     *
     * set a new timeout for synchronisation
     */
    _setNewTimeout() {
        let updateInterval = Homey.ManagerSettings.get('updateInterval');

        if (!updateInterval) {
            updateInterval = 15;
        }

        let interval = 1000 * 60 * updateInterval;

        this._syncTimeout = setTimeout(this._synchroniseSensorData.bind(this), interval);
    }

    /**
     * @abstract
     *
     * the name of the BLE for identification
     */
    getMiFloraBleIdentification() {
        throw new Error('todo: Implement getMiFloraBleIdentification into child class');
    }

    /**
     * @abstract
     *
     * the human readable name of the BLE
     */
    getMiFloraBleName() {
        throw new Error('todo: Implement getMiFloraBleName into child class');
    }

    /**
     * @abstract
     *
     * the supported capabilities
     */
    getSupportedCapabilities() {
        throw new Error('todo: Implement getSupportedCapabilities into child class');
    }

    /**
     * update the devices one by one
     *
     * @param devices
     * @returns {Promise.<MiFloraDevice[]>}
     */
    _updateDevices(devices) {
        return devices.reduce((promise, device) => {
            return promise
                .then(() => {
                    device.retry = 0;
                    return this._updateDevice(device);
                }).catch(error => {
                    console.log(error);
                });
        }, Promise.resolve());
    }

    /**
     * update the devices one by one
     *
     * @param device
     * @returns {Promise.<device>}
     */
    _updateDevice(device) {
        return new Promise((resolve, reject) => {
            console.log('update device ' + device.getName());
            try {
                this._handleUpdateSequence(device)
                    .then(device => {
                        device.retry = 0;
                        resolve(device);
                    })
                    .catch(error => {
                        device.retry++;
                        console.log('retry ' + device.retry);
                        console.log(error);

                        if (device.retry < MAX_RETRIES) {
                            resolve(this._updateDevice(device));
                        }

                        reject('Max retries exceeded, no success');
                    });
            }
            catch (error) {
                reject(error);
            }
        })
    }

    /**
     * mock for testing the update devices one by one
     *
     * @param device
     * @returns {Promise.<device>}
     */
    _handleUpdateSequenceTest(device) {
        return new Promise((resolve, reject) => {
            // reject by name
            if (device.getName() === 'Aloe') {
                setTimeout(function () {
                    console.log('_updateDeviceDataPromise reject');
                    reject('some exception');
                }, 500);
            }
            else {
                setTimeout(function () {
                    console.log('_updateDeviceDataPromise resolve');
                    resolve(device);
                }, 500);
            }
        });
    }

    _buildHtmlReport(devices) {
        const dom = new JSDOM(`<!DOCTYPE html>`);
        const document = dom.window.document;
        const target = document.createElement("div");

        devices.forEach(function (device) {
            target.innerHTML = target.innerHTML + device.buildHtmlCharts();
        });

        return target.innerHTML;
    }

    /**
     * connect to the sensor, update data and disconnect
     *
     * @param device
     * @returns {Promise.<device>}
     */
    _handleUpdateSequence(device) {
        return new Promise((resolve, reject) => {
            let updateDeviceTime = new Date();

            Homey.app.discover(device)
                .then((device) => {
                    return Homey.app.connect(device);
                })
                .catch(error => {
                    reject(error);
                })
                .then((device) => {
                    return Homey.app.updateDeviceCharacteristicData(device);
                })
                .catch(error => {

                    Homey.app.disconnect(device)
                        .catch(error => {
                            reject(error);
                        });

                    reject(error);
                })
                .then((device) => {
                    console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');

                    Homey.app.disconnect(device)
                        .catch(error => {
                            reject(error);
                        });

                    resolve(device);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * render a list of devices for pairing to homey
     *
     * @param data
     * @param callback
     */
    onPairListDevices(data, callback) {
        Homey.app.discoverDevices(this)
            .then(devices => {
                callback(null, devices);
            })
            .catch(error => {
                reject('Cannot get devices:' + error);
            });
    }
}

module.exports = MiFloraDriver;