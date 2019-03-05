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
        try {

            let devices = this.getDevices()

            if (devices.length === 0) {
                this._setNewTimeout();
            } else {
                let updateDevicesTime = new Date();
                this._updateDevices(devices)
                    .then(() => {
                        console.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds');
                        console.log('------------------------------------------------------------------------------------------------------------------------------------------------');

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
        return await devices.reduce((promise, device) => {
            if (device.retry === undefined) {
                device.retry = 0;
            }
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

        console.log('#########################################');
        console.log('# update device: '+device.getName());
        console.log('#########################################');

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
                    'deviceName': device.getName(),
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
        let disconnectPeripheral = function(){};

        return await Homey.app.discover(device)
            .then((advertisement) => {
                advertisement.connect()
                    .then( peripheral => {

                        console.log('advertisement::connect');

                        disconnectPeripheral = () => {
                            process.nextTick(() => {
                                try {
                                    if(peripheral.isConnected) {
                                        console.log('disconnectPeripheral::disconnect');
                                        peripheral.disconnect(() => {})
                                    }
                                } catch (err) {
                                    this.error(err);
                                }
                            })
                        }

                        console.log('peripheral::getService');
                        return peripheral.getService(DATA_SERVICE_UUID);
                    })
                    .then( dataService => {
                        console.log('dataService::discoverCharacteristics');
                        return dataService.discoverCharacteristics();
                    })
                    .then( characteristics => {
                        characteristics.forEach(function (characteristic) {
                            console.log(characteristic.uuid);
                            switch (characteristic.uuid) {
                                case DATA_CHARACTERISTIC_UUID:
                                    console.log('DATA_CHARACTERISTIC_UUID::read');
                                    characteristic.read().then((data, error) => {
                                        console.log('DATA_CHARACTERISTIC_UUID::read ok!');
                                        if (error) {
                                            throw new Error('failed to read DATA_CHARACTERISTIC_UUID: ' + error);
                                        }

                                        if (data) {

                                            let checkCharacteristics = device.getCapabilities();

                                            let characteristicValues = {
                                                'measure_temperature': data.readUInt16LE(0) / 10,
                                                'measure_luminance': data.readUInt32LE(3),
                                                'flora_measure_fertility': data.readUInt16LE(8),
                                                'flora_measure_moisture': data.readUInt16BE(6)
                                            }

                                            console.log(characteristicValues);

                                            checkCharacteristics.forEach(function (characteristic) {
                                                if (characteristicValues.hasOwnProperty(characteristic)) {
                                                    device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
                                                }
                                            });
                                        } else {
                                            throw new Error('No data found for sensor values.');
                                        }
                                    })
                                    break
                                case FIRMWARE_CHARACTERISTIC_UUID:
                                    console.log('FIRMWARE_CHARACTERISTIC_UUID::read');
                                    characteristic.read().then((data, error) => {
                                        console.log('FIRMWARE_CHARACTERISTIC_UUID::read ok!');
                                        if (error) {
                                            throw new Error('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
                                        }
                                        if (data) {
                                            let checkCharacteristics = [
                                                "measure_battery"
                                            ];

                                            let characteristicValues = {
                                                'measure_battery': parseInt(data.toString('hex', 0, 1), 16),
                                            }

                                            checkCharacteristics.forEach(function (characteristic) {
                                                if (characteristicValues.hasOwnProperty(characteristic)) {
                                                    device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
                                                }
                                            });

                                            let firmwareVersion = data.toString('ascii', 2, data.length);

                                            device.setSettings({
                                                firmware_version: firmwareVersion,
                                                last_updated: new Date().toISOString(),
                                                uuid: device.getData().uuid
                                            });

                                            console.log({
                                                firmware_version: firmwareVersion,
                                                last_updated: new Date().toISOString(),
                                                uuid: device.getData().uuid
                                            });

                                            console.log('return device');
                                            return device;

                                        } else {
                                            throw new Error('No data found for firmware.');
                                        }
                                    });

                                    break;
                                case REALTIME_CHARACTERISTIC_UUID:
                                    console.log('REALTIME_CHARACTERISTIC_UUID::write');
                                    characteristic.write(Buffer.from([0xA0, 0x1F])).then(() => {
                                        console.log('REALTIME_CHARACTERISTIC_UUID::read ok!');
                                    });
                                    break;
                            }
                        })
                    })
                    .then( (device) => {

                        console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');

                        console.log('call disconnectPeripheral complete');
                        disconnectPeripheral();

                        return device;
                    })
                    .catch( error => {
                        console.log('call disconnectPeripheral error');
                        disconnectPeripheral();
                        throw error;
                    })
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