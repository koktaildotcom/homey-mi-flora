"use strict";

const Homey = require('homey');
const MAX_RETRIES = 3;

class MiFloraDriver extends Homey.Driver {

    onInit() {
        this._synchroniseSensorData();
    }

    _synchroniseSensorData() {
        let devices = this.getDevices();
        if (devices.length === 0) {
            this._setNewTimeout();
        }
        else {
            let updateDevicesTime = new Date();
            this._updateDevices(devices)
                .then(devices => {
                    console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');
                    this._setNewTimeout();
                })
                .catch(error => {
                    console.log(error);
                    this._setNewTimeout();
                });
        }
    }

    getMiFloraBleIdentification() {
        throw new Error('todo: Implement getMiFloraBleIdentification into child class');
    }

    getMiFloraBleName() {
        throw new Error('todo: Implement getMiFloraBleName into child class');
    }

    getCapabilities() {
        throw new Error('todo: Implement getCapabilities into child class');
    }

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

    _setNewTimeout() {
        let updateInterval = Homey.ManagerSettings.get('updateInterval');

        if (!updateInterval) {
            updateInterval = 15;
        }

        let interval = 1000 * 60 * updateInterval;

        this._syncTimeout = setTimeout(this._synchroniseSensorData.bind(this), interval);
    }

    _handleUpdateSequence(device) {
        return new Promise((resolve, reject) => {
            let updateDeviceTime = new Date();

            Homey.app.discover(device)
                .then((device) => {
                    return Homey.app.connect(device);
                }).catch(error => {
                reject(error);
            })
                .then((device) => {
                    return Homey.app.updateDeviceCharacteristicData(device);
                }).catch(error => {
                reject(error);
            })
                .then((device) => {
                    return Homey.app.disconnect(device);
                }).catch(error => {
                reject(error);
            })
                .then((device) => {
                    console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');
                    resolve(device);
                }).catch(error => {
                reject(error);
            });
        });
    }

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