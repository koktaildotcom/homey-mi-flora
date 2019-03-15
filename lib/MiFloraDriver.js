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

            let devices = this.getDevices();

            // @todo remove
            // testing one
            // let devices = [];
            // if(this.getDevices().length !== 0) {
            //     devices.push(this.getDevices()[0]);
            // }

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
        // interval = 1000 * 60;

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

        console.log('find');
        const advertisement = await Homey.app.find(device);

        console.log('connect');
        const peripheral = await advertisement.connect();

        const disconnectPeripheral = async () => {
            try {
                console.log('try to disconnect peripheral')
                if (peripheral.isConnected) {
                    console.log('disconnect peripheral')
                    return await peripheral.disconnect()
                }
            } catch (err) {
                throw new Error(err);
            }
        };

        try {
            console.log('get dataServive');
            const dataServive = await peripheral.getService(DATA_SERVICE_UUID);

            console.log('get characteristics');
            const characteristics = await dataServive.discoverCharacteristics();

            let characteristicsNames = await device.getCapabilities();

            await asyncForEach(characteristics, async (characteristic) => {
                console.log(characteristic.uuid);
                switch (characteristic.uuid) {
                    case DATA_CHARACTERISTIC_UUID:
                        console.log('DATA_CHARACTERISTIC_UUID::read');
                        const sensorData = await characteristic.read();

                        let sensorValues = {
                            'measure_temperature': sensorData.readUInt16LE(0) / 10,
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

            console.log('call disconnectPeripheral');
            await disconnectPeripheral();
            console.log('Device sync complete in: ' + (new Date() - updateDeviceTime) / 1000 + ' seconds');

            return device;
        }
        catch (error) {
            await disconnectPeripheral();

            throw error;
        }
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