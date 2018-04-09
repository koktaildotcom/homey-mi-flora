"use strict";

const Homey = require('homey');

class MiFloraDriver extends Homey.Driver {

    onInit() {
        this._synchroniseSensorData();
    }

    getMiFloraBleIdentification() {
        throw new Error('todo: Implement into child class');
    }

    getMiFloraBleName() {
        throw new Error('todo: Implement into child class');
    }

    _getUpdateInterval() {

        let updateInterval = Homey.ManagerSettings.get('updateInterval');

        if (!updateInterval) {
            updateInterval = 15;
        }

        return 1000 * 60 * updateInterval;
    }

    _setNewTimeout() {
        console.log('    ');
        this._syncTimeout = setTimeout(this._synchroniseSensorData.bind(this), this._getUpdateInterval());
    }

    _synchroniseSensorData() {
        let devices = this.getDevices();

        if (devices.length === 0) {
            console.log("No devices paired, set timeout for next check.");
            this._setNewTimeout();
        }
        else {
            let updateDevicesTime = new Date();
            Homey.app._updateDevices(devices)
                .then(devices => {
                    console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');
                    this._setNewTimeout();
                })
                .catch(error => {
                    console.log(error);
                    console.log('_updateDevices error');
                    this._setNewTimeout();
                });
        }
    }

    onPairListDevices(data, callback) {
        Homey.app.getDevices(this.getMiFloraBleIdentification(), this.getMiFloraBleName())
            .then(devices => {
                callback(null, devices);
            })
            .catch(error => {
                reject('Cannot get devices:' + error);
            });
    }
}

module.exports = MiFloraDriver;