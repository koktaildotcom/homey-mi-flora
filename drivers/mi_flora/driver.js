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
        });
    }

    updateSensorData(device) {
        return new Promise((resolve, reject) => {
            let deviceData = {};
            device.peripheral.discoverServices((error, services) => {
                if (error) {
                    device.peripheral.disconnect();
                    reject("failed connection to services: " + error);
                }
                services.forEach(function (service) {
                    service.discoverCharacteristics((error, characteristics) => {
                        if (error) {
                            device.peripheral.disconnect();
                            reject("failed connection to services: " + error);
                        }

                        characteristics.forEach(function (characteristic) {
                            switch (characteristic.uuid) {
                                case DATA_CHARACTERISTIC_UUID:
                                    characteristic.read(function (error, data) {
                                        if (error) {
                                            device.peripheral.disconnect();
                                            reject("failed connection to services: " + error);
                                        }

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

                                        resolve(device);
                                    });

                                    break;
                                case REALTIME_CHARACTERISTIC_UUID:
                                    console.log('enabling realtime');
                                    characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                    break;
                            }
                        })
                    });
                });
            });
        });
    }

    onInit() {
        this.updateDevices(this.getDevices()).then((devices) => console.log(`FINAL RESULT`));
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
                                console.log('getData success');
                                console.log(device.getData());

                                return device;
                            }).catch(error => {

                            reject("Cannot get advertisement " + error);
                        })
                            .then((device) => {
                                console.log('disconnect peripheral');
                                //device.advertisement.disconnect();

                                resolve('Device sync complete ' + device.uuid);
                                return device;

                            }).catch(error => {

                            reject("Cannot disconnect " + error);
                        })
                    })

                })
                .catch(console.error);
        }, Promise.resolve());
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