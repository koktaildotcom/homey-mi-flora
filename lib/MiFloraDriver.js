"use strict";

const Homey = require('homey');

class MiFloraDriver extends Homey.Driver {

    /**
     * init the driver
     */
    onInit() {
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

            // @todo remove
            // testing one
            // let devices = [];
            // if(this.getDevices().length !== 0) {
            //     devices.push(this.getDevices()[0]);
            // }

            let updateDevicesTime = new Date();

            if(devices.length > 0){
                Homey.app.updateDevices(devices)
                    .then(() => {
                        console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');
                        console.log('------------------------------------------------------------------------------------------------------------------------------------------------');

                        console.log('set timeout 2');
                        this._setNewTimeout();
                    })
                    .catch(error => {
                        this._setNewTimeout();
                        console.log('set timeout 3');
                        throw new Error(error);
                    });
            }
        } catch (error) {
            this._setNewTimeout();
            console.log('set timeout 4');
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
            Homey.ManagerSettings.set('updateInterval', updateInterval)
        }

        let interval = 1000 * 60 * updateInterval;

        // @todo remove
        // test fast iteration timeout
        // interval = 1000 * 5;

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
     * mock for testing the update devices one by one
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    async _handleUpdateSequenceTest(device) {
        return new Promise((resolve, reject) => {
            // reject by name
            if (device.getName() === 'Ceropegia') {
                setTimeout(function () {
                    console.log('_updateDeviceDataPromise reject');
                    reject('some exception');
                }, 500);
            } else {
                setTimeout(function () {
                    console.log('_updateDeviceDataPromise resolve');
                    resolve(device);
                }, 500);
            }
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
                callback(new Error('Cannot get devices:' + error));
            });
    }
}

module.exports = MiFloraDriver;