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
            let interval = 1000 * 2;

            let scope = this;
            setTimeout(function () {
                let reportEvent = scope.htmlReport;
                let devices = scope.getDevices();
                const report = scope._buildHtmlReport(devices);
                devices.forEach(function (device) {
                    console.log('send report for : %s', device.getName());
                    reportEvent.trigger({
                        'device': device.getName(),
                        'html_report': report
                    });
                });

            }, interval);
        }

        this._synchroniseSensorData();
    }

    /**
     * @private
     *
     * start the synchronisation
     */
    _synchroniseSensorData() {
        try {
            let devices = this.getDevices();
            if (devices.length === 0) {
                this._setNewTimeout();
            }
            else {
                let updateDevicesTime = new Date();
                let reportEvent = this.htmlReport;
                let scope = this;
                this._updateDevices(devices)
                    .then(devices => {
                        console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');

                        const report = scope._buildHtmlReport(this.getDevices());
                        reportEvent.trigger({
                            'html_report': report
                        })
                            .then(function () {
                                console.log('sending html report done');
                            })
                            .catch(function (error) {
                                console.error('Cannot trigger flow card html_report device: %s.', error);
                            });

                        this._setNewTimeout();
                    })
                    .catch(error => {
                        this._setNewTimeout();
                        throw new Error(error);
                    });
            }
        }
        catch (error) {
            console.log(error);
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
     * @param devices MiFloraDevice[]
     *
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
     * @param device MiFloraDevice
     *
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
                        console.log('timout, retry again' + device.retry);
                        console.log(error);

                        if (device.retry < MAX_RETRIES) {
                            resolve(this._updateDevice(device));
                        }

                        device.globalSensorTimeout.trigger({
                            'device': device.getName()
                        })
                            .then(function () {
                                console.log('sending device timeout trigger');
                            })
                            .catch(function (error) {
                                console.error('Cannot trigger flow card sensor_timeout device: %s.', error);
                            });

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
     * @param device MiFloraDevice
     *
     * @returns {Promise.<device>}
     */
    _handleUpdateSequenceTest(device) {
        return new Promise((resolve, reject) => {
            // reject by name
            if (device.getName() === 'Ceropegia') {
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

    /**
     * @param devices <MiFloraDevice>
     *
     * @return string
     */
    _buildHtmlReport(devices) {
        const dom = new JSDOM(`<!DOCTYPE html>`);
        const document = dom.window.document;
        const target = document.createElement("div");

        devices.forEach(function (device) {
            target.innerHTML = target.innerHTML + device.buildHtmlChart();
        });

        return target.innerHTML;
    }

    /**
     * connect to the sensor, update data and disconnect
     *
     * @param device MiFloraDevice
     *
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
                    return Homey.app.updateDeviceCharacteristicData(device).catch(error => {

                        Homey.app.disconnect(device, true)
                            .catch(error => {
                                reject(error);
                            });

                        reject(error);
                    })
                })
                .catch(error => {

                    Homey.app.disconnect(device, false)
                        .catch(error => {
                            reject(error);
                        });

                    reject(error);
                })
                .then((device) => {

                    console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');

                    Homey.app.disconnect(device, true)
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