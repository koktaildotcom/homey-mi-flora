"use strict";

const Homey = require('homey');

const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';

const MAX_RETRIES = 3;

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

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

            //let devices = this.getDevices()

            // @todo remove
            // testing one
            let devices = [];
            if(this.getDevices().length !== 0) {
                devices.push(this.getDevices()[0]);
            }

            let updateDevicesTime = new Date();

            if(devices.length > 0){
                this._updateDevices(devices)
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
         interval = 5000;

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
    async _handleUpdateSequence2(device) {
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
                console.log(peripheral);``
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
                console.log('call write REALTIME_CHARACTERISTIC_UUID');
                return service.write(REALTIME_CHARACTERISTIC_UUID, Buffer.from([0xA0, 0x1F]), false).then(() => {
                    return service;
                }).catch((error) => {
                    console.log(' ----- already in realtime mode!');
                    console.log(error);

                    return service;
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
     * connect to the sensor, update data and disconnect
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    async _handleUpdateSequence(device) {

        console.log('_handleUpdateSequence');
        let updateDeviceTime = new Date();

        const advertisement = await Homey.app.discover(device);
        const peripheral = await advertisement.connect();

        const disconnectPeripheral = async () => {
            process.nextTick(() => {
                try {
                    console.log('disconnect peripheral')
                    if(peripheral.isConnected) {
                        return peripheral.disconnect()
                    }
                } catch (err) {
                    throw new Error(err);
                }
            })
        };

        const dataServive = await peripheral.getService(DATA_SERVICE_UUID);
        const characteristics = await dataServive.discoverCharacteristics();

        let characteristicsNames = await device.getCapabilities();

        await asyncForEach(characteristics, async (characteristic) => {
            console.log(characteristic.uuid);
            switch (characteristic.uuid) {
                case DATA_CHARACTERISTIC_UUID:
                    console.log('DATA_CHARACTERISTIC_UUID::read');
                    const sensorData = await characteristic.read();

                    let sensorValues = {
                        'measure_temperature': sensorData.readUInt16LE(0)/10,
                        'measure_luminance': sensorData.readUInt32LE(3),
                        'flora_measure_fertility': sensorData.readUInt16LE(8),
                        'flora_measure_moisture': sensorData.readUInt16BE(6)
                    }
                    console.log(sensorValues);

                    await asyncForEach(characteristicsNames, async (characteristic) => {
                        if (sensorValues.hasOwnProperty(characteristic)) {
                            device.updateCapabilityValue(characteristic, sensorValues[characteristic]);
                        }
                    });

                    break
                case FIRMWARE_CHARACTERISTIC_UUID:
                    console.log('FIRMWARE_CHARACTERISTIC_UUID::read');

                    const firmwareData = await characteristic.read();

                    const batteryValue = parseInt(firmwareData.toString('hex', 0, 1), 16);
                    const batteryValues = {
                        'measure_battery': batteryValue
                    }

                    await asyncForEach(characteristicsNames, async (characteristic) => {
                        if (batteryValues.hasOwnProperty(characteristic)) {
                            device.updateCapabilityValue(characteristic, batteryValues[characteristic]);
                        }
                    });

                    let firmwareVersion = firmwareData.toString('ascii', 2, firmwareData.length);

                    await device.setSettings({
                        firmware_version: firmwareVersion,
                        last_updated: new Date().toISOString(),
                        uuid: device.getData().uuid
                    });

                    console.log({
                        firmware_version: firmwareVersion,
                        last_updated: new Date().toISOString(),
                        uuid: device.getData().uuid,
                        battery: batteryValue
                    });

                    break;
                case REALTIME_CHARACTERISTIC_UUID:
                    console.log('REALTIME_CHARACTERISTIC_UUID::write');
                    await characteristic.write(Buffer.from([0xA0, 0x1F]));
                    console.log('REALTIME_CHARACTERISTIC_UUID::read ok!');

                    break;
            }
        });

        await disconnectPeripheral();
        console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');

        return device;



        // return await Homey.app.discover(device)
        //     .then((advertisement) => {
        //         advertisement.connect()
        //             .then( peripheral => {
        //
        //                 console.log('advertisement::connect');
        //
        //                 disconnectPeripheral = () => {
        //                     process.nextTick(() => {
        //                         try {
        //                             if(peripheral.isConnected) {
        //                                 console.log('disconnectPeripheral::disconnect');
        //                                 peripheral.disconnect(() => {})
        //                             }
        //                         } catch (err) {
        //                             this.error(err);
        //                         }
        //                     })
        //                 }
        //
        //                 console.log('peripheral::getService');
        //                 return peripheral.getService(DATA_SERVICE_UUID);
        //             })
        //             .then( dataService => {
        //                 console.log('dataService::discoverCharacteristics');
        //                 return dataService.discoverCharacteristics();
        //             })
        //             .then( characteristics => {
        //                 characteristics.forEach(function (characteristic) {
        //                     console.log(characteristic.uuid);
        //                     switch (characteristic.uuid) {
        //                         case DATA_CHARACTERISTIC_UUID:
        //                             console.log('DATA_CHARACTERISTIC_UUID::read');
        //                             characteristic.read().then((data, error) => {
        //                                 console.log('DATA_CHARACTERISTIC_UUID::read ok!');
        //                                 if (error) {
        //                                     throw new Error('failed to read DATA_CHARACTERISTIC_UUID: ' + error);
        //                                 }
        //
        //                                 if (data) {
        //
        //                                     let checkCharacteristics = device.getCapabilities();
        //
        //                                     let characteristicValues = {
        //                                         'measure_temperature': data.readUInt16LE(0) / 10,
        //                                         'measure_luminance': data.readUInt32LE(3),
        //                                         'flora_measure_fertility': data.readUInt16LE(8),
        //                                         'flora_measure_moisture': data.readUInt16BE(6)
        //                                     }
        //
        //                                     console.log(characteristicValues);
        //
        //                                     checkCharacteristics.forEach(function (characteristic) {
        //                                         if (characteristicValues.hasOwnProperty(characteristic)) {
        //                                             device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
        //                                         }
        //                                     });
        //                                 } else {
        //                                     throw new Error('No data found for sensor values.');
        //                                 }
        //                             })
        //                             break
        //                         case FIRMWARE_CHARACTERISTIC_UUID:
        //                             console.log('FIRMWARE_CHARACTERISTIC_UUID::read');
        //                             characteristic.read().then((data, error) => {
        //                                 console.log('FIRMWARE_CHARACTERISTIC_UUID::read ok!');
        //                                 if (error) {
        //                                     throw new Error('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
        //                                 }
        //                                 if (data) {
        //                                     let checkCharacteristics = [
        //                                         "measure_battery"
        //                                     ];
        //
        //                                     let characteristicValues = {
        //                                         'measure_battery': parseInt(data.toString('hex', 0, 1), 16),
        //                                     }
        //
        //                                     checkCharacteristics.forEach(function (characteristic) {
        //                                         if (characteristicValues.hasOwnProperty(characteristic)) {
        //                                             device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
        //                                         }
        //                                     });
        //
        //                                     let firmwareVersion = data.toString('ascii', 2, data.length);
        //
        //                                     device.setSettings({
        //                                         firmware_version: firmwareVersion,
        //                                         last_updated: new Date().toISOString(),
        //                                         uuid: device.getData().uuid
        //                                     });
        //
        //                                     console.log({
        //                                         firmware_version: firmwareVersion,
        //                                         last_updated: new Date().toISOString(),
        //                                         uuid: device.getData().uuid
        //                                     });
        //
        //                                     console.log('return device');
        //                                     return device;
        //
        //                                 } else {
        //                                     throw new Error('No data found for firmware.');
        //                                 }
        //                             });
        //
        //                             break;
        //                         case REALTIME_CHARACTERISTIC_UUID:
        //                             console.log('REALTIME_CHARACTERISTIC_UUID::write');
        //                             characteristic.write(Buffer.from([0xA0, 0x1F])).then(() => {
        //                                 console.log('REALTIME_CHARACTERISTIC_UUID::read ok!');
        //                             });
        //                             break;
        //                     }
        //                 })
        //             })
        //             .then( (device) => {
        //
        //                 console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');
        //
        //                 console.log('call disconnectPeripheral complete');
        //                 disconnectPeripheral();
        //
        //                 return device;
        //             })
        //             .catch( error => {
        //                 console.log('call disconnectPeripheral error');
        //                 disconnectPeripheral();
        //                 throw error;
        //             })
        //     });
    }

    /**
     * This method is called during the pair process by Home.emit with in the frontend.
     */
    onPair() {
        this._setNewTimeout();
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