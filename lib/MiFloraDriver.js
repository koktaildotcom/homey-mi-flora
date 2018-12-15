"use strict";

const Homey = require('homey');

const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';

const MAX_RETRIES = 3;

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
        console.log('------------------------------------------------------------------------------------------------------------------------------------------------');
        console.log('start _synchroniseSensorData @ ' + new Date().toISOString());
        try {
            let devices = this.getDevices();
            if (devices.length === 0) {
                this._setNewTimeout();
            } else {
                let updateDevicesTime = new Date();
                this._updateDevices(devices)
                    .then(() => {
                        console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');

                        this._setNewTimeout();
                    })
                    .catch(error => {
                        this._setNewTimeout();
                        throw new Error(error);
                    });
            }
        } catch (error) {
            this._setNewTimeout();
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

interval = 1000 * 60;

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
    async _updateDevices(devices) {
        console.log('_updateDevices');
        return devices.reduce((promise, device) => {
            return promise
                .then(() => {
                    console.log('reduce');
                    device.retry = 0;
                    return this._updateDevice(device)
                        .catch((error) => {
                            throw new Error(error);
                        });

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
     * @returns {Promise.<MiFloraDevice>}
     */
    async _updateDevice(device) {
        if (device.retry === undefined) {
            device.retry = 0;
        }
        console.log('update device ' + device.getName());
        console.log('call _handleUpdateSequence');
        return await this._handleUpdateSequence(device)
            .then(() => {
                device.retry = 0;
                return device;
            })
            .catch(error => {
                device.retry++;
                console.log('timeout, retry again' + device.retry);
                console.log(error);

                if (device.retry < MAX_RETRIES) {
                    return this._updateDevice(device)
                        .catch((error) => {
                            throw new Error(error);
                        });
                }

                Homey.app.globalSensorTimeout.trigger({
                    'device': device.getName(),
                    'reason': error
                })
                    .then(function () {
                        console.log('sending device timeout trigger');
                    })
                    .catch(function (error) {
                        console.error('Cannot trigger flow card sensor_timeout device: %s.', error);
                    });

                throw new Error('Max retries exceeded, no success');
            });
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
     * connect to the sensor, update data and disconnect
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    async _handleUpdateSequence(device) {
        console.log('_handleUpdateSequence');
        let updateDeviceTime = new Date();
        let connection = null;
        try {
            console.log('call discover');
            return await Homey.app.discover(device)
                .then((advertisement) => {
                    console.log('call connect');
                    return advertisement.connect().then((peripheral) => {
                        if (!peripheral) {
                            throw new Error("Peripheral not found");
                        }
                        connection = peripheral;
                        return peripheral;
                    }).catch((error) => {
                        throw new Error(error);
                    });
                })
                .then((peripheral) => {
                    //console.log('peripheral');
                    //console.log(peripheral);
                    console.log('call getService');
                    return peripheral.getService(DATA_SERVICE_UUID).then((service) => {
                        if (service) {
                            return service;
                        }

                        throw new Error("No data service found.");
                    }).catch((error) => {
                        console.log(error);
                        throw new Error("No data service found.");
                    });
                })
                .then((service) => {
                    //console.log('service');
                    //console.log(service);
                    console.log('call write REALTIME_CHARACTERISTIC_UUID');
                    return service.write(REALTIME_CHARACTERISTIC_UUID, Buffer.from([0xA0, 0x1F]), false).then(() => {
                        return service;
                    }).catch((error) => {
                        console.log(' ----- already in realtime mode!');
                        console.log(error);
                        throw new Error(error);
                    });
                })
                .then((service) => {
                    // console.log('service');
                    // console.log(service);
                    console.log('call write DATA_CHARACTERISTIC_UUID');
                    return service.read(DATA_CHARACTERISTIC_UUID).then((data) => {

                        let checkCharacteristics = device.getCapabilities();

                        let characteristicValues = {
                            'measure_temperature': data.readUInt16LE(0) / 10,
                            'measure_luminance': data.readUInt32LE(3),
                            'flora_measure_fertility': data.readUInt16LE(8),
                            'flora_measure_moisture': data.readUInt16BE(6)
                        };

                        console.log(characteristicValues);

                        checkCharacteristics.forEach(function (characteristic) {
                            if (characteristicValues.hasOwnProperty(characteristic)) {
                                device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
                            }
                        });

                        return service;
                    })
                        .catch((error) => {
                            console.log('No data characteristic found');
                            console.log(error);
                            return service;
                        });
                })
                .then((service) => {
                    //console.log('service');
                    //console.log(service);
                    console.log('call write FIRMWARE_CHARACTERISTIC_UUID');
                    return service.read(FIRMWARE_CHARACTERISTIC_UUID).then((data) => {

                        let checkCharacteristics = [
                            "measure_battery"
                        ];

                        let characteristicValues = {
                            'measure_battery': parseInt(data.toString('hex', 0, 1), 16),
                        };

                        checkCharacteristics.forEach(function (characteristic) {
                            if (characteristicValues.hasOwnProperty(characteristic)) {
                                device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
                            }
                        });

                        let firmwareVersion = data.toString('ascii', 2, data.length);

                        console.log({
                            firmware_version: firmwareVersion,
                            last_updated: new Date().toISOString(),
                            uuid: device.getData().uuid
                        });

                        device.setSettings({
                            firmware_version: firmwareVersion,
                            last_updated: new Date().toISOString(),
                            uuid: device.getData().uuid
                        });

                        return service.peripheral;
                    })
                        .catch((error) => {
                            console.log('No firmware characteristic found');
                            console.log(error);
                            return service.peripheral;
                        });
                })
                .then((peripheral) => {
                    //console.log('peripheral disconnect');
                    //console.log(peripheral);
                    console.log('call disconnect 1');
                    return peripheral.disconnect()
                        .then(function () {

                            console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');

                            return device;
                        })
                        .catch(function (error) {
                            throw new Error(error);
                        });
                })
                .catch((error) => {
                    //console.log('connection disconnect');
                    //console.log(connection);
                    if (connection !== null) {
                        console.log('call disconnect 2');
                        connection.disconnect()
                            .then(function () {
                                throw new Error(error);
                            })
                            .catch(function (error) {
                                throw new Error(error);
                            });
                    } else {
                        throw new Error(error);
                    }
                });

        } catch (error) {
            if (connection !== null) {
                console.log('call disconnect 3');
                connection.disconnect()
                    .then(function () {
                        throw new Error(error);
                    })
                    .catch(function (error) {
                        throw new Error(error);
                    });
            } else {
                throw new Error(error);
            }
        }
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