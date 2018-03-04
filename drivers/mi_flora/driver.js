'use strict';

const Homey = require('homey');

const FLOWER_CARE_NAME = 'Flower care';
const FLOWER_CARE_VERSION = 'v1.0.0';

const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';

class MiFloraDriver extends Homey.Driver {

    getAdvertisements(device) {
        return new Promise((resolve, reject) => {
            Homey.ManagerBLE.discover().then(function (advertisements) {
                advertisements.forEach(function (advertisement) {
                    if (advertisement.uuid === device.getData().uuid) {
                        resolve(advertisement);
                    }
                });
            });
        });
    }

    getPeripheral(advertisement) {
        return new Promise((resolve, reject) => {
            advertisement.connect((error, peripheral) => {
                if (error) {
                    reject('failed connection to peripheral: ' + error);
                }
                resolve(peripheral);
            });
        });
    }

    getData(peripheral) {
        return new Promise((resolve, reject) => {

            peripheral.discoverServices((error, services) => {
                if (error) {
                    reject("failed connection to services: " + error);
                }

                console.log('got services!');
                services.forEach(function (service) {

                    service.discoverCharacteristics((error, characteristics) => {

                        if (error) {
                            reject("failed connection to services: " + error);
                        }

                        if (characteristics) {
                            characteristics.forEach(function (characteristic) {
                                console.log('got characteristic ' + characteristic.uuid);

                                switch (characteristic.uuid) {

                                    case DATA_CHARACTERISTIC_UUID:
                                        characteristic.read(function (error, data) {

                                            if (error) {
                                                reject("failed connection to services: " + error);
                                            }

                                            console.log('read characteristic ' + characteristic.uuid);

                                            console.log(data);

                                            let temperature = data.readUInt16LE(0) / 10;
                                            let lux = data.readUInt32LE(3);
                                            let moisture = data.readUInt16BE(6);
                                            let fertility = data.readUInt16LE(8);

                                            console.log('temperature: %s °C', temperature);
                                            console.log('Light: %s lux', lux);
                                            console.log('moisture: %s %', moisture);
                                            console.log('fertility: %s µS/cm', fertility);

                                            resolve({
                                                "temperature": temperature,
                                                "lux": lux,
                                                "moisture": moisture,
                                                "fertility": fertility
                                            });
                                        });
                                        break;
                                    // case FIRMWARE_CHARACTERISTIC_UUID:
                                    //
                                    //     console.log('read characteristic ' + characteristic.uuid);
                                    //     characteristic.read(function (error, data) {
                                    //
                                    //         if (error) {
                                    //             console.log("failed read characteristic: %s", error);
                                    //         }
                                    //
                                    //         let batteryLevel = parseInt(data.toString('hex', 0, 1), 16);
                                    //         let firmwareVersion = data.toString('ascii', 2, data.length);
                                    //
                                    //         console.log('batteryLevel: %s %', batteryLevel);
                                    //         console.log('firmwareVersion: %s ', firmwareVersion);
                                    //     });
                                    //
                                    //     break;
                                    case REALTIME_CHARACTERISTIC_UUID:
                                        console.log('enabling realtime');
                                        characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                        break;
                                    default:
                                    // //console.log('found characteristic uuid %s but not matched the criteria', characteristic.uuid);
                                }
                            })
                        }
                    });
                });
            });
        });
    }

    onInit() {

        let driver = this;

        console.log('getData start');
        this.getDevices().forEach(function (device) {
            driver.getAdvertisements(device)
                .then((advertisement) => {
                    console.log('getAdvertisements success');
                    return driver.getPeripheral(advertisement);
                }).catch(error => {

                console.log("Cannot get advertisement", error);
            })
                .then((peripheral) => {
                    console.log('got peripheral');
                    return driver.getData(peripheral);
                }).catch(error => {

                console.log("Cannot get data", error);
            })
                .then((data) => {
                    console.log('getData success');
                    console.log(data);
                }).catch(error => {

                console.log("Cannot get advertisement", error);
            })
                .then(() => {
                    // simulate `finally` clause
                    console.log('clean up');
                    console.log('disconnect Advertisements');
                    // return driver.disconnectAdvertisements(advertisement);
                });
        });

    }


    // onInit() {
    //     this.connectDevicesX(this.getDevices());
    // }

    connectDevicesX(devices) {
        Homey.ManagerBLE.discover().then(function (advertisements) {
            advertisements.forEach(function (advertisement) {
                devices.forEach(function (device) {
                    if (advertisement.uuid === device.getData().uuid) {
                        console.log('updateData ' + advertisement.uuid);

                        advertisement.connect((error, peripheral) => {
                            if (error) {
                                console.log("failed connection to peripheral: %s", error);
                            }

                            peripheral.discoverServices((error, services) => {
                                if (error) {
                                    console.log("failed connection to services: %s", error);
                                }

                                console.log('got services!');
                                services.forEach(function (service) {

                                    service.discoverCharacteristics((error, characteristics) => {
                                        if (error) {
                                            console.log("failed connection to characteristics: %s", error);
                                        }

                                        if (characteristics) {
                                            characteristics.forEach(function (characteristic) {
                                                console.log('got characteristic ' + characteristic.uuid);

                                                switch (characteristic.uuid) {

                                                    case DATA_CHARACTERISTIC_UUID:
                                                        characteristic.read(function (error, data) {
                                                            if (error) {
                                                                console.log("failed read characteristic: %s", error);
                                                            }

                                                            console.log('read characteristic ' + characteristic.uuid);

                                                            let temperature = data.readUInt16LE(0) / 10;
                                                            let lux = data.readUInt32LE(3);
                                                            let moisture = data.readUInt16BE(6);
                                                            let fertility = data.readUInt16LE(8);

                                                            console.log('temperature: %s °C', temperature);
                                                            console.log('Light: %s lux', lux);
                                                            console.log('moisture: %s %', moisture);
                                                            console.log('fertility: %s µS/cm', fertility);

                                                            device.setCapabilityValue("measure_temperature", temperature);
                                                            device.setCapabilityValue("measure_luminance", lux);
                                                            device.setCapabilityValue("measure_humidity", moisture);
                                                            device.setCapabilityValue("measure_conductivity", fertility);
                                                        });
                                                        break;
                                                    case FIRMWARE_CHARACTERISTIC_UUID:

                                                        console.log('read characteristic ' + characteristic.uuid);
                                                        characteristic.read(function (error, data) {

                                                            if (error) {
                                                                console.log("failed read characteristic: %s", error);
                                                            }

                                                            let batteryLevel = parseInt(data.toString('hex', 0, 1), 16);
                                                            let firmwareVersion = data.toString('ascii', 2, data.length);

                                                            device.setCapabilityValue("measure_battery", batteryLevel);

                                                            console.log('batteryLevel: %s %', batteryLevel);
                                                            console.log('firmwareVersion: %s ', firmwareVersion);
                                                        });

                                                        break;
                                                    case REALTIME_CHARACTERISTIC_UUID:
                                                        console.log('enabling realtime');
                                                        characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                                        break;
                                                    default:
                                                    //console.log('found characteristic uuid %s but not matched the criteria', characteristic.uuid);
                                                }
                                            })
                                        }
                                    });
                                });
                            });
                        });
                    }
                });
            });
        })
            .catch(function (error) {
                console.log("catch failure %s", error);
            });
    }

    updateSensorData() {

        // Return new promise
        return new Promise(function (resolve, reject) {

            Homey.ManagerBLE.discover().then(function (advertisements) {

                advertisements.forEach(function (advertisement) {

                    if (advertisement.uuid === uuid) {

                        console.log('connected ' + advertisement.uuid);

                        advertisement.connect((error, peripheral) => {
                            if (error) {
                                reject(error);
                            }

                            peripheral.discoverServices((error, services) => {
                                if (error) {
                                    reject(error);
                                }

                                console.log('got services!');
                                services.forEach(function (service) {
                                    service.discoverCharacteristics((error, characteristics) => {
                                        if (error) {
                                            reject(error);
                                        }
                                        characteristics.forEach(function (characteristic) {
                                            console.log('got characteristic ' + characteristic.uuid);

                                            switch (characteristic.uuid) {

                                                case DATA_CHARACTERISTIC_UUID:
                                                    characteristic.read(function (error, data) {
                                                        if (error) {
                                                            reject(error);
                                                        }

                                                        console.log('read characteristic ' + characteristic.uuid);

                                                        let temperature = data.readUInt16LE(0) / 10;
                                                        let lux = data.readUInt32LE(3);
                                                        let moisture = data.readUInt16BE(6);
                                                        let fertility = data.readUInt16LE(8);

                                                        console.log('temperature: %s °C', temperature);
                                                        console.log('Light: %s lux', lux);
                                                        console.log('moisture: %s %', moisture);
                                                        console.log('fertility: %s µS/cm', fertility);

                                                        device.setCapabilityValue("measure_temperature", temperature);
                                                        device.setCapabilityValue("measure_luminance", lux);
                                                        device.setCapabilityValue("measure_humidity", moisture);
                                                        device.setCapabilityValue("measure_conductivity", fertility);
                                                    });
                                                    break;
                                                case FIRMWARE_CHARACTERISTIC_UUID:

                                                    console.log('read characteristic ' + characteristic.uuid);
                                                    characteristic.read(function (error, data) {

                                                        if (error) {
                                                            reject(error);
                                                        }

                                                        let batteryLevel = parseInt(data.toString('hex', 0, 1), 16);
                                                        let firmwareVersion = data.toString('ascii', 2, data.length);

                                                        device.setCapabilityValue("measure_battery", batteryLevel);

                                                        console.log('batteryLevel: %s %', batteryLevel);
                                                        console.log('firmwareVersion: %s ', firmwareVersion);
                                                    });

                                                    break;
                                                case REALTIME_CHARACTERISTIC_UUID:
                                                    console.log('enabling realtime');
                                                    characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                                    break;
                                                default:
                                                //console.log('found characteristic uuid %s but not matched the criteria', characteristic.uuid);
                                            }
                                        })
                                    });
                                });
                            });
                        });
                    }
                });

                resolve(true);
            })
                .catch(function (error) {
                    reject(error);
                });
        })
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