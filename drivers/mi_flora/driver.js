"use strict";

const Homey = require('homey');

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

        if (true) {
            this._synchroniseSensorData();
        }

        this._syncInterval = setInterval(this._synchroniseSensorData.bind(this), 1000 * 60 * updateInterval);
        //clearInterval(this._syncInterval);
    }

    _synchroniseSensorData() {
        let devices = this.getDevices();

        if (devices.length === 0) {
            console.log("No devices paired.");
            return;
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

                        driver._discover(device).then((device) => {
                            return driver._connect(device);
                        }).catch(error => {
                            console.log('fail 1');
                            reject(error);
                        })
                            .then((device) => {
                                return driver._updateSensorData(device);
                            }).catch(error => {
                            console.log('fail 2');
                            reject(error);
                        })
                            .then((device) => {
                                return driver._disconnect(device);
                            }).catch(error => {
                            console.log('fail 3');
                            reject(error);
                        })
                            .then((device) => {
                                console.log('Device sync complete');
                                resolve('Device sync complete ' + device.getData().uuid);

                                return device;
                            }).catch(error => {
                            console.log('fail 4');
                            reject(error);
                        });

                    })
                }).catch(error => {
                    console.log('fail device');
                    console.log(error);
                    driver._disconnect(device);
                });

        }, Promise.resolve());
    }

    _discover(device) {
        console.log('Discover');
        if (device) {
            return new Promise((resolve, reject) => {
                try {
                    Homey.ManagerBLE.discover().then(function (advertisements) {
                        if (advertisements) {
                            advertisements.forEach(function (advertisement) {
                                if (advertisement.uuid === device.getData().uuid) {
                                    device.advertisement = advertisement;

                                    resolve(device);
                                }
                            });
                        }
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
        }
    }

    _connect(device) {
        console.log('Connect');
        return new Promise((resolve, reject) => {
            try {
                if (device) {
                    device.advertisement.connect((error, peripheral) => {
                        if (error) {
                            reject('failed connection to peripheral: ' + error);
                        }

                        device.peripheral = peripheral;

                        resolve(device);
                    });
                }
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
                if (device) {
                    device.peripheral.disconnect((error, peripheral) => {
                        if (error) {
                            reject('failed connection to peripheral: ' + error);
                        }
                        resolve(device);
                    });
                }
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

                    console.log(index, currentValue);
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

                                                if (!data) {
                                                    reject('No data found for sensor values.');
                                                }

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
                                            })
                                            break
                                        case FIRMWARE_CHARACTERISTIC_UUID:
                                            characteristic.read(function (error, data) {
                                                if (error) {
                                                    reject('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
                                                }

                                                if (!data) {
                                                    reject('No data found for firmware.');
                                                }

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
                                                })
                                                //.then(() => null)
                                                    .catch(function (error) {
                                                        reject('failed add firmware settings ' + error);
                                                    });

                                                resolve(device);
                                            });

                                            break;
                                        case REALTIME_CHARACTERISTIC_UUID:
                                            characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                            break;
                                    }
                                })
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