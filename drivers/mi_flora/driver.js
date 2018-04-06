"use strict";

const Homey = require('homey');

const MAX_RETRIES = 3;

const FLOWER_CARE_NAME = 'Flower care';
const APP_VERSION = 'v1.0.0';

const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';

class MiFloraDriver extends Homey.Driver {

    onInit() {
        this._synchroniseSensorData();
    }

    _synchroniseSensorData() {
        let devices = this.getDevices();

        if (devices.length === 0) {
            console.log("No devices paired, set timeout for next check.");
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
                    console.log('_updateDevices error');
                    this._setNewTimeout();
                });
        }
    }

    _setNewTimeout() {
        this._updateInterval = Homey.ManagerSettings.get('updateInterval');
        if (!this._updateInterval) {
            this._updateInterval = 15;
        }
        console.log('    ');

        this._syncTimeout = setTimeout(this._synchroniseSensorData.bind(this), 1000 * 60 * this._updateInterval);
    }

    _updateDevice(device) {
        return new Promise((resolve, reject) => {
            console.log('update device ' + device.getName());
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

    _handleUpdateSequenceMock(device) {
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

    _handleUpdateSequence(device) {
        return new Promise((resolve, reject) => {
            let updateDeviceTime = new Date();

            this._discover(device).then((device) => {
                return this._connect(device);
            }).catch(error => {
                reject(error);
            })
                .then((device) => {
                    return this._updateDeviceCharacteristicData(device);
                }).catch(error => {
                reject(error);
            })
                .then((device) => {
                    return this._disconnect(device);
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

    _discover(device) {
        console.log('Discover');
        return new Promise((resolve, reject) => {
            if (device) {
                if (device.advertisement) {
                    console.log('Already found');
                    resolve(device);
                }
                Homey.ManagerBLE.discover().then(function (advertisements) {
                    if (advertisements) {

                        let matched = advertisements.filter(function (advertisement) {
                            return (advertisement.uuid === device.getData().uuid);
                        });

                        if (matched.length === 1) {
                            device.advertisement = matched[0];

                            resolve(device);
                        }
                        else {
                            reject("Cannot find advertisement with uuid " + device.getData().uuid);
                        }
                    }
                    else {
                        reject("Cannot find any advertisements");
                    }
                });
            }
            else {
                reject("No device found");
            }
        });
    }

    _connect(device) {
        console.log('Connect');
        return new Promise((resolve, reject) => {
            try {
                device.advertisement.connect((error, peripheral) => {
                    if (error) {
                        reject('failed connection to peripheral: ' + error);
                    }

                    device.peripheral = peripheral;

                    resolve(device);
                });
            }
            catch (error) {
                reject(error);
            }
        })
    }

    _disconnect(device) {
        console.log('Disconnect');
        return new Promise((resolve, reject) => {
            try {
                device.peripheral.disconnect((error, peripheral) => {
                    if (error) {
                        reject('failed connection to peripheral: ' + error);
                    }
                    resolve(device);
                });
            }
            catch (error) {
                reject(error);
            }
        })
    }

    _updateDeviceCharacteristicData(device) {
        return new Promise((resolve, reject) => {
            try {
                const updateCapabilityValue = function (device, index, value) {
                    let currentValue = device.getCapabilityValue(index);

                    // force change if its the save value
                    if (currentValue === value) {
                        device.setCapabilityValue(index, null);
                        device.setCapabilityValue(index, value);
                        device.triggerCapabilityListener(index, value);
                    }
                    else {
                        device.setCapabilityValue(index, value);
                        device.triggerCapabilityListener(index, value);
                    }
                }

                if (device) {
                    console.log('Update :%s', device.getName());
                }
                else {
                    reject('Cannot device anymore');
                }
                device.peripheral.discoverServices((error, services) => {
                    if (error) {
                        reject('failed discoverServices: ' + error);
                    }

                    if (services) {
                        services.forEach(function (service) {
                            service.discoverCharacteristics((error, characteristics) => {
                                if (error) {
                                    reject('failed discoverCharacteristics: ' + error);
                                }

                                if (characteristics) {
                                    characteristics.forEach(function (characteristic) {
                                        switch (characteristic.uuid) {
                                            case DATA_CHARACTERISTIC_UUID:
                                                characteristic.read(function (error, data) {
                                                    if (error) {
                                                        reject('failed to read DATA_CHARACTERISTIC_UUID: ' + error);
                                                    }

                                                    if (data) {
                                                        let checkCharacteristics = [
                                                            "measure_temperature",
                                                            "measure_luminance",
                                                            "measure_conductivity",
                                                            "measure_moisture",
                                                        ];

                                                        let characteristicValues = {
                                                            'measure_temperature': data.readUInt16LE(0) / 10,
                                                            'measure_luminance': data.readUInt32LE(3),
                                                            'measure_conductivity': data.readUInt16LE(8),
                                                            'measure_moisture': data.readUInt16BE(6)
                                                        }

                                                        checkCharacteristics.forEach(function (characteristic) {
                                                            if (characteristicValues.hasOwnProperty(characteristic)) {
                                                                updateCapabilityValue(device, characteristic, characteristicValues[characteristic]);
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        reject('No data found for sensor values.');
                                                    }
                                                })
                                                break
                                            case FIRMWARE_CHARACTERISTIC_UUID:
                                                characteristic.read(function (error, data) {
                                                    if (error) {
                                                        reject('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
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
                                                                updateCapabilityValue(device, characteristic, characteristicValues[characteristic]);
                                                            }
                                                        });

                                                        let firmwareVersion = data.toString('ascii', 2, data.length);

                                                        device.setSettings({
                                                            firmware_version: firmwareVersion,
                                                            last_updated: new Date().toISOString()
                                                        });

                                                        resolve(device);
                                                    }
                                                    else {
                                                        reject('No data found for firmware.');
                                                    }
                                                });

                                                break;
                                            case REALTIME_CHARACTERISTIC_UUID:
                                                characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                                break;
                                        }
                                    })
                                }
                                else {
                                    reject('No characteristics found.');
                                }
                            });
                        });
                    }
                    else {
                        reject('No services found.');
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }

    onPairListDevices(data, callback) {
        let devices = [];
        let index = 0;
        Homey.ManagerBLE.discover().then(function (advertisements) {
            advertisements.forEach(function (advertisement) {
                if (advertisement.localName === FLOWER_CARE_NAME) {
                    ++index;
                    devices.push({
                        "name": FLOWER_CARE_NAME + " " + index,
                        "data": {
                            "id": advertisement.id,
                            "uuid": advertisement.uuid,
                            "name": advertisement.name,
                            "type": advertisement.type,
                            "version": APP_VERSION,
                        },
                        "capabilities": [
                            "measure_temperature",
                            "measure_luminance",
                            "measure_conductivity",
                            "measure_moisture",
                            "measure_battery"
                        ],
                    });
                }
            });

            callback(null, devices);
        })
            .catch(function (error) {
                console.error('Cannot discover BLE devices from the homey manager.', error);
            });
    }
}

module.exports = MiFloraDriver;