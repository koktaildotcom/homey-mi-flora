"use strict";

class MiFloraDriver {

    run() {

        let devices = [
            {'name': 'test 1'},
            {'name': 'test 2'},
            {'name': 'test 3'},
            {'name': 'test 4'}
        ];

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
                                resolve('Device sync complete ' + device.name);

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
        console.log('-----------------------');
        console.log('_discover');
        return new Promise((resolve, reject) => {
            // Homey.ManagerBLE.discover().then(function (advertisements) {
            //     if (advertisements) {
            //         advertisements.forEach(function (advertisement) {
            //             if (advertisement.uuid === device.getData().uuid) {
            //                 device.advertisement = advertisement;
            //
            //                 resolve(device);
            //             }
            //         });
            //     }
            // });

            //device.advertisement = {"name": 'advertisement ' + device.name};

            resolve(device);

            reject('some error ' + device.name);
        });
    }

    _connect(device) {
        console.log('Connect');
        return new Promise((resolve, reject) => {
            // if (device) {
            //     device.advertisement.connect((error, peripheral) => {
            //         if (error) {
            //             reject('failed connection to peripheral: ' + error);
            //         }
            //
            //     });
            // }

            device.peripheral = {"name": 'peripheral ' + device.name};

            resolve(device);
        })
    }

    _disconnect(device) {
        console.log('Disconnect');
        return new Promise((resolve, reject) => {
            // if (device) {
            //     device.peripheral.disconnect((error, peripheral) => {
            //         if (error) {
            //             reject('failed connection to peripheral: ' + error);
            //         }
            //         resolve(device);
            //     });
            // }

            resolve(device);
        })
    }

    _updateSensorData(device) {
        console.log('_updateSensorData');
        return new Promise((resolve, reject) => {

            if (device.name === 'test 3') {
                reject('failed some error');
            }
            else {
                setTimeout(function () {
                    resolve(device)
                }, 1500);
            }

            // const updateCapabilityValue = function (device, index, value) {
            //     let currentValue = device.getCapabilityValue(index);
            //
            //     // force change if its the save value
            //     if (currentValue === value) {
            //         device.setCapabilityValue(index, null);
            //         device.setCapabilityValue(index, value);
            //     }
            //     else {
            //         device.setCapabilityValue(index, value);
            //         device.triggerCapabilityListener(index, value)
            //         //.then(() => null)
            //             .catch(function (error) {
            //                 reject('failed to trigger ' + index + ' because of: ' + error);
            //             });
            //     }
            // }
            //
            // if (device) {
            //     console.log('Update :%s', device.getName());
            // }
            // else {
            //     reject('Cannot device anymore');
            // }
            // device.peripheral.discoverServices((error, services) => {
            //     if (error) {
            //         reject('failed discoverServices: ' + error);
            //     }
            //
            //     if (!services) {
            //         reject('No services found.');
            //     }
            //
            //     services.forEach(function (service) {
            //         service.discoverCharacteristics((error, characteristics) => {
            //             if (error) {
            //                 reject('failed discoverCharacteristics: ' + error);
            //             }
            //
            //             if (characteristics) {
            //                 characteristics.forEach(function (characteristic) {
            //                     switch (characteristic.uuid) {
            //                         case DATA_CHARACTERISTIC_UUID:
            //                             characteristic.read(function (error, data) {
            //                                 if (error) {
            //                                     reject('failed to read DATA_CHARACTERISTIC_UUID: ' + error);
            //                                 }
            //
            //                                 if (!data) {
            //                                     reject('No data found for sensor values.');
            //                                 }
            //
            //                                 let checkCharacteristics = [
            //                                     "measure_temperature",
            //                                     "measure_luminance",
            //                                     "measure_conductivity",
            //                                     "measure_moisture",
            //                                 ];
            //
            //                                 let characteristicValues = {
            //                                     'measure_temperature': data.readUInt16LE(0) / 10,
            //                                     'measure_luminance': data.readUInt32LE(3),
            //                                     'measure_conductivity': data.readUInt16BE(6),
            //                                     'measure_moisture': data.readUInt16LE(8)
            //                                 }
            //
            //                                 console.log(characteristicValues);
            //
            //                                 checkCharacteristics.forEach(function (characteristic) {
            //                                     if (characteristicValues.hasOwnProperty(characteristic)) {
            //                                         updateCapabilityValue(device, characteristic, characteristicValues[characteristic]);
            //                                     }
            //                                 });
            //                             })
            //                             break
            //                         case FIRMWARE_CHARACTERISTIC_UUID:
            //                             characteristic.read(function (error, data) {
            //                                 if (error) {
            //                                     reject('failed to read FIRMWARE_CHARACTERISTIC_UUID: ' + error);
            //                                 }
            //
            //                                 if (!data) {
            //                                     reject('No data found for firmware.');
            //                                 }
            //
            //                                 let checkCharacteristics = [
            //                                     "measure_battery"
            //                                 ];
            //
            //                                 let characteristicValues = {
            //                                     'measure_battery': parseInt(data.toString('hex', 0, 1), 16),
            //                                 }
            //
            //                                 checkCharacteristics.forEach(function (characteristic) {
            //                                     if (characteristicValues.hasOwnProperty(characteristic)) {
            //                                         updateCapabilityValue(device, characteristic, characteristicValues[characteristic]);
            //                                     }
            //                                 });
            //
            //                                 let firmwareVersion = data.toString('ascii', 2, data.length);
            //
            //                                 device.setSettings({
            //                                     firmware_version: firmwareVersion,
            //                                     last_updated: new Date().toISOString()
            //                                 })
            //                                 //.then(() => null)
            //                                     .catch(function (error) {
            //                                         reject('failed add firmware settings ' + error);
            //                                     });
            //
            //                                 resolve(device);
            //                             });
            //
            //                             break;
            //                         case REALTIME_CHARACTERISTIC_UUID:
            //                             characteristic.write(Buffer.from([0xA0, 0x1F]), false);
            //                             break;
            //                     }
            //                 })
            //             }
            //         });
            //     });
            // });

        });
    }
}

let driver = new MiFloraDriver();
driver.run();