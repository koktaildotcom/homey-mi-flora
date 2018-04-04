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

        let updateInterval = Homey.ManagerSettings.get('updateInterval');
        if (!updateInterval) {
            updateInterval = 15;
        }

        this._synchroniseSensorData();
        this._syncInterval = setInterval(this._synchroniseSensorData.bind(this), 1000 * 60 * updateInterval);
    }

    _synchroniseSensorData() {
        let devices = this.getDevices();

        devices = devices.filter(function (device) {
            return (device.getSetting('retries') === null || device.getSetting('retries') <= MAX_RETRIES);
        });
        devices.sort(function (a, b) {
            return new Date(a.getSetting('last_updated')) - new Date(b.getSetting('last_updated'));
        });

        if (devices.length === 0) {
            console.log('nothing to update');
        }
        else {
            let device = devices[0];

            console.log('update');
            console.log(device.getName());
            console.log('last_updated ' + device.getSetting('last_updated'));
            console.log('retries ' + device.getSetting('retries'));

            try {
                this._updateDeviceDataPromise(device).then((device) => {
                    console.log('reset retries');
                    device.setSettings({
                        retries: 0
                    });
                    this._synchroniseSensorData();
                }).catch(error => {
                    console.log(error);
                    this._synchroniseSensorData();
                    device.setSettings({
                        retries: device.getSetting('retries') + 1
                    });
                });
            } catch (error) {
                console.log(error);
            }
        }
    }

    _updateDeviceDataPromise(device) {
        console.log('_updateDeviceDataPromise');
        let driver = this;
        return new Promise((resolve, reject) => {
            let initialTime = new Date();
            try {
                driver._discover(device).then((device) => {
                    return driver._connect(device);
                })
                    .then((device) => {
                        return driver._updateSensorData(device);
                    })
                    .then((device) => {
                        return driver._disconnect(device);
                    })
                    .then((device) => {
                        console.log('Device sync complete in: ' + (new Date() - initialTime) / 1000 + ' seconds');
                        resolve(device);

                    })
            } catch (error) {
                reject(error);
            }
        });
    }

    onInit2() {

        let updateInterval = Homey.ManagerSettings.get('updateInterval');
        if (!updateInterval) {
            updateInterval = 15;
        }

        if (true) {
            this._synchroniseSensorData2();
        }

        this._syncInterval = setInterval(this._synchroniseSensorData2.bind(this), 1000 * 60 * updateInterval);
        //clearInterval(this._syncInterval);
    }

    _synchroniseSensorData2() {
        let devices = this.getDevices();

        if (devices.length === 0) {
            console.log("No devices paired.");
        }

        this._updateDevices(devices)
            .then(devices => {
                console.log("All devices are synced.");
            })
            .catch(error => {
                console.log(error);
            });
    }

    _updateDevices(devices) {
        let driver = this;
        return devices.reduce((promise, device) => {
            return promise
                .then(() => {
                    return new Promise((resolve, reject) => {

                        let initialTime = new Date();

                        driver._discover(device).then((device) => {
                            return driver._connect(device);
                        }).catch(error => {
                            reject(error);
                        })
                            .then((device) => {
                                return driver._updateSensorData(device);
                            }).catch(error => {
                            reject(error);
                        })
                            .then((device) => {
                                return driver._disconnect(device);
                            }).catch(error => {
                            reject(error);
                        })
                            .then((device) => {
                                console.log('Device sync complete in: ' + (new Date() - initialTime) / 1000 + ' seconds');
                                resolve('Device sync complete in: ' + (new Date() - initialTime) / 1000 + ' seconds');

                                return device;
                            }).catch(error => {
                            reject(error);
                        });
                    })
                }).catch(error => {
                    console.log(error);
                    driver._disconnect(device);
                });

        }, Promise.resolve());
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

                        console.log(matched);

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

    _updateSensorData(device) {
        return new Promise((resolve, reject) => {
            try {
                const updateCapabilityValue = function (device, index, value) {
                    let currentValue = device.getCapabilityValue(index);

                    // force change if its the save value
                    if (currentValue === value) {
                        device.setCapabilityValue(index, null);
                        device.setCapabilityValue(index, value);
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

                    if (!services) {
                        reject('No services found.');
                    }

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

                                                    console.log(characteristicValues);

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