'use strict';

const Homey = require('homey');

const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';

// make the BLE beta backwards compatible for 1.5.8 and maybe previous versions (not tested).
if (process.env.HOMEY_VERSION.replace(/\W/g, '') < 159) {
    Homey.BlePeripheral.prototype.disconnect = function disconnect(callback) {
        if (typeof callback === 'function')
            return Homey.util.callbackAfterPromise(this, this.disconnect, arguments);

        const disconnectPromise = new Promise((resolve, reject) => {
            this._disconnectQueue.push((err, result) => err ? reject(err) : resolve(result));
        });

        if (this._disconnectLockCounter === 0) {
            clearTimeout(this._disconnectTimeout);
            this._disconnectTimeout = setTimeout(() => {
                if (this._disconnectLockCounter === 0) {
                    this._disconnected();
                    // console.log('called disconnect', new Error().stack);
                    this.__client.emit('disconnect', [this._connectionId, this.uuid], err => {
                        this._connectionId = null;
                        this._disconnectQueue.forEach(cb => cb(err));
                        this._disconnectQueue.length = 0;
                    });
                }
            }, 100);
        }

        return disconnectPromise;
    };

    Homey.BlePeripheral.prototype.getService = async function getService(uuid, callback) {
        if (typeof callback === 'function')
            return Homey.util.callbackAfterPromise(this, this.getService, arguments);

        this.resetConnectionWarning();

        let service = Array.isArray(this.services) ? this.services.find(service => service.uuid === uuid) : null;

        if (!service) {
            const [discoveredService] = await this.discoverServices([uuid]);

            if (!discoveredService && !Array.isArray(this.services)) {
                return Promise.reject(new Error('Error, could not get services'));
            }
            service = discoveredService;
        }

        return service || Promise.reject(new Error(`No service found with UUID ${uuid}`));
    };
}

class HomeyMiFlora extends Homey.App {

    /**
     * init the app
     */
    onInit() {
        console.log('Successfully init HomeyMiFlora');
    }

    /**
     * discover advertisements
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    discover(device) {
        console.log('Discover');
        return new Promise((resolve, reject) => {
            if (device) {
                if (device.advertisement) {
                    console.log('Already found');
                    resolve(device);
                }
                Homey.ManagerBLE.discover().then(function (advertisements) {
                    if (advertisements) {

                        let matchedAdvertisements = advertisements.filter(function (advertisement) {
                            return (advertisement.uuid === device.getAddress() || advertisement.uuid === device.getAddress());
                        });

                        if (matchedAdvertisements.length === 1) {
                            device.advertisement = matchedAdvertisements[0];

                            resolve(device);
                        }
                        else {
                            reject("Cannot find advertisement with uuid " + device.getAddress());
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

    /**
     * connect to advertisement and return peripheral
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    connect(device) {
        console.log('Connect');
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

    /**
     * disconnect from peripheral
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    disconnect(device) {
        console.log('Disconnect');
        return new Promise((resolve, reject) => {

            if (device && device.peripheral) {
                device.peripheral.disconnect((error, peripheral) => {
                    if (error) {
                        reject('failed connection to peripheral: ' + error);
                    }
                    resolve(device);
                });
            }
            else {
                reject('cannot disconnect to unknown device or peripheral');
            }
        })
    }

    /**
     * disconnect from peripheral
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    updateDeviceCharacteristicData(device) {
        return new Promise((resolve, reject) => {
            if (device) {
                console.log('Update :%s', device.getName());
            }
            else {
                reject('Cannot update device anymore');
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
                                                            device.updateCapabilityValue(characteristic, characteristicValues[characteristic]);
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
        });
    }

    /**
     * disconnect from peripheral
     *
     * @returns {Promise.<object[]>}
     */
    discoverDevices(driver) {
        return new Promise((resolve, reject) => {
            let devices = [];
            let index = 0;
            Homey.ManagerBLE.discover().then(function (advertisements) {
                advertisements.forEach(function (advertisement) {
                    if (advertisement.localName === driver.getMiFloraBleIdentification()) {
                        ++index;
                        devices.push({
                            "name": driver.getMiFloraBleName() + " " + index,
                            "data": {
                                "id": advertisement.id + 'x',
                                "uuid": advertisement.uuid,
                                "address": advertisement.uuid,
                                "name": advertisement.name,
                                "type": advertisement.type,
                                "version": "v" + Homey.manifest.version,
                            },
                            "capabilities": driver.getSupportedCapabilities(),
                        });
                    }
                });

                resolve(devices);
            })
                .catch(function (error) {
                    reject('Cannot discover BLE devices from the homey manager. ' + error);
                });
        })
    }
}

module.exports = HomeyMiFlora;