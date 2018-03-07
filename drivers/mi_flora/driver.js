'use strict';

const Homey = require('homey');

const FLOWER_CARE_NAME = 'Flower care';
const FLOWER_CARE_VERSION = 'v1.0.0';

const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';

const POLL_INTERVAL = 1000 * 60 * 1; // 10 min

class MiFloraDriver extends Homey.Driver {

    onInit() {
        this._devices = this.getDevices();
        this._synchroniseSensorData();
        this._syncInterval = setInterval(this._synchroniseSensorData.bind(this), POLL_INTERVAL);
    }

    _synchroniseSensorData() {
        this.updateDevices(this._devices)
            .then(devices => {
                console.log("All devices are synced.");
            })
            .catch(error => {
                console.log(error);
            });
    }

    updateDevices(devices) {
        let driver = this;
        return devices.reduce((promise, device) => {
            return promise
                .then(() => {
                    return new Promise((resolve, reject) => {
                        driver.getAdvertisements(device)
                            .then((device) => {
                                console.log('getAdvertisements success');
                                return driver.getPeripheral(device);
                            }).catch(error => {

                            reject("Cannot get advertisement " + error);
                        })
                            .then((device) => {
                                return driver.updateSensorData(device);
                            }).catch(error => {

                            reject("Cannot get data " + error);
                        })
                            .then((device) => {
                                console.log('success updateSensorData');
                                //device.advertisement.disconnect();
                                //setTimeout(() => device.peripheral.disconnect(), 3000);

                                resolve('Device sync complete ' + device.getData().uuid);

                                return device;

                            }).catch(error => {

                            reject("failed update sensor " + error);
                        })
                    })

                })
                .catch(console.error);
        }, Promise.resolve());
    }

    getAdvertisements(device) {
        return new Promise((resolve, reject) => {
            Homey.ManagerBLE.discover().then(function (advertisements) {
                advertisements.forEach(function (advertisement) {
                    if (advertisement.uuid === device.getData().uuid) {
                        device.advertisement = advertisement;

                        resolve(device);
                    }
                });
            });
        });
    }

    getPeripheral(device) {
        return new Promise((resolve, reject) => {
            device.advertisement.connect((error, peripheral) => {
                if (error) {
                    reject('failed connection to peripheral: ' + error);
                }

                device.peripheral = peripheral;

                resolve(device);
            });
        })
    }

    updateSensorData(device) {
        return new Promise((resolve, reject) => {
            device.peripheral.discoverServices((error, services) => {
                if (error) {
                    reject('failed discoverServices: ' + error);
                }

                if (0 === services.length) {
                    reject('No services found');
                }

                services.forEach(function (service) {
                    service.discoverCharacteristics((error, characteristics) => {
                        if (error) {
                            reject('failed discoverCharacteristics: ' + error);
                        }

                        if (0 === characteristics.length) {
                            reject('No characteristics found');
                        }

                        characteristics.forEach(function (characteristic) {
                            switch (characteristic.uuid) {
                                case DATA_CHARACTERISTIC_UUID:
                                    characteristic.read(function (error, data) {
                                        if (error) {
                                            reject('failed to read DATA_CHARACTERISTIC_UUID: ' + error);
                                        }

                                        let temperature = data.readUInt16LE(0) / 10;
                                        let lux = data.readUInt32LE(3);
                                        let moisture = data.readUInt16BE(6);
                                        let fertility = data.readUInt16LE(8);

                                        console.log({
                                            "temperature:": temperature + " °C",
                                            "light:": lux + " lux",
                                            "moisture:": moisture + " %",
                                            "fertility:": fertility + " µS/cm",
                                        });

                                        device.setCapabilityValue('measure_temperature', temperature);
                                        device.setCapabilityValue('measure_luminance', lux);
                                        device.setCapabilityValue('measure_humidity', moisture);
                                        device.setCapabilityValue('measure_conductivity', fertility);

                                    });
                                    break;
                                case FIRMWARE_CHARACTERISTIC_UUID:
                                    characteristic.read(function (error, data) {
                                        if (error) {
                                            reject('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
                                        }

                                        let batteryLevel = parseInt(data.toString('hex', 0, 1), 16);
                                        let firmwareVersion = data.toString('ascii', 2, data.length);

                                        device.setCapabilityValue('measure_battery', batteryLevel);

                                        resolve(device);
                                    });

                                    break;
                                case REALTIME_CHARACTERISTIC_UUID:
                                    characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                    break;
                            }
                        })
                    });
                });
            });
        });
    }

    updateSensorData2(device) {
        return new Promise((resolve, reject) => {
            device.peripheral.discoverServices((error, services) => {
                if (error) {
                    reject('failed discoverServices: ' + error);
                }
                services.forEach(function (service) {
                    service.discoverCharacteristics((error, characteristics) => {
                        if (error) {
                            reject('failed discoverCharacteristics: ' + error);
                        }

                        characteristics.forEach(function (characteristic) {
                            switch (characteristic.uuid) {
                                case DATA_CHARACTERISTIC_UUID:
                                    characteristic.read(function (error, data) {
                                        if (error) {
                                            reject('failed to read DATA_CHARACTERISTIC_UUID: ' + error);
                                        }

                                        console.log(service.uuid);

                                        let temperature = data.readUInt16LE(0) / 10;
                                        let lux = data.readUInt32LE(3);
                                        let moisture = data.readUInt16BE(6);
                                        let fertility = data.readUInt16LE(8);

                                        console.log({
                                            "temperature:": temperature + " °C",
                                            "light:": lux + " lux",
                                            "moisture:": moisture + " %",
                                            "fertility:": fertility + " µS/cm",
                                        });

                                        device.setCapabilityValue('measure_temperature', temperature);
                                        device.setCapabilityValue('measure_luminance', lux);
                                        device.setCapabilityValue('measure_humidity', moisture);
                                        device.setCapabilityValue('measure_conductivity', fertility);
                                    });
                                    break;
                                case FIRMWARE_CHARACTERISTIC_UUID:
                                    characteristic.read(function (error, data) {
                                        if (error) {
                                            reject('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
                                        }

                                        let batteryLevel = parseInt(data.toString('hex', 0, 1), 16);
                                        let firmwareVersion = data.toString('ascii', 2, data.length);

                                        device.setCapabilityValue('measure_battery', batteryLevel);

                                        resolve(device);
                                    });

                                    break;
                                case REALTIME_CHARACTERISTIC_UUID:
                                    characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                    break;
                            }
                        })
                    });
                });
            });
        });
    }

    onPairListDevices(data, callback) {

        let devices = [];
        let index = 0;

        Homey.ManagerBLE.discover().then(function (advertisements) {
            console.log('discovering!');
            advertisements.forEach(function (advertisement) {
                if (advertisement.localName === FLOWER_CARE_NAME) {
                    ++index;
                    console.log('Find device ' + advertisement.uuid);
                    devices.push({
                        "name": FLOWER_CARE_NAME + " " + index,
                        "data": {
                            "id": advertisement.id,
                            "uuid": advertisement.uuid,
                            "name": advertisement.name,
                            "type": advertisement.type,
                            "version": FLOWER_CARE_VERSION,
                        },
                        "capabilities": [
                            "measure_temperature",
                            "measure_luminance",
                            "measure_humidity",
                            "measure_conductivity",
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