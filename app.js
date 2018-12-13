'use strict';

const Homey = require('homey');

const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';

class HomeyMiFlora extends Homey.App {

    /**
     * init the app
     */
    onInit() {
        console.log('Successfully init HomeyMiFlora version: %s', Homey.app.manifest.version);

        this.deviceSensorUpdated = new Homey.FlowCardTriggerDevice('device_sensor_updated');
        this.deviceSensorUpdated.register();

        this.globalSensorUpdated = new Homey.FlowCardTrigger('sensor_updated');
        this.globalSensorUpdated.register();

        this.deviceSensorChanged = new Homey.FlowCardTriggerDevice('device_sensor_changed');
        this.deviceSensorChanged.register();

        this.globalSensorChanged = new Homey.FlowCardTrigger('sensor_changed');
        this.globalSensorChanged.register();

        this.globalSensorTimeout = new Homey.FlowCardTrigger('sensor_timeout');
        this.globalSensorTimeout.register();

        this.globalSensorThresholdMinExceeds = new Homey.FlowCardTrigger('sensor_threshold_min_exceeds');
        this.globalSensorThresholdMinExceeds.register();

        this.deviceSensorThresholdMinExceeds = new Homey.FlowCardTriggerDevice('device_sensor_threshold_min_exceeds');
        this.deviceSensorThresholdMinExceeds.register();

        this.globalSensorThresholdMaxExceeds = new Homey.FlowCardTrigger('sensor_threshold_max_exceeds');
        this.globalSensorThresholdMaxExceeds.register();

        this.deviceSensorThresholdMaxExceeds = new Homey.FlowCardTriggerDevice('device_sensor_threshold_max_exceeds');
        this.deviceSensorThresholdMaxExceeds.register();

        this.globalSensorOutsideThreshold = new Homey.FlowCardTrigger('sensor_outside_threshold');
        this.globalSensorOutsideThreshold.register();

        this.deviceSensorOutsideThreshold = new Homey.FlowCardTriggerDevice('device_sensor_outside_threshold');
        this.deviceSensorOutsideThreshold.register();
    }

    /**
     * discover advertisements
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<BleAdvertisement>}
     */
    async discover(device) {
        return await Homey.ManagerBLE.discover().then(function (advertisements) {

            let matchedAdvertisements = advertisements.filter(function (advertisement) {
                return (advertisement.uuid === device.getAddress() || advertisement.uuid === device.getAddress());
            });

            if (matchedAdvertisements.length === 0) {
                throw new Error('Advertisement not found.');
            }

            return matchedAdvertisements[0];
        })
            .catch((error) => {
                throw new Error(error);
            });

        // await Homey.ManagerBLE.find(device.getAddress()).then(function (advertisement) {
        //     return advertisement;
        // });
    }


    /**
     * disconnect from peripheral
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    updateDeviceCharacteristicData(device) {
        return new Promise((resolve, reject) => {
            if (device) {
                console.log('Update :%s', device.getName());
            } else {
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
                                                } else {
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
                                                        last_updated: new Date().toISOString(),
                                                        uuid: device.getData().uuid
                                                    });

                                                    resolve(device);
                                                } else {
                                                    reject('No data found for firmware.');
                                                }
                                            });

                                            break;
                                        case REALTIME_CHARACTERISTIC_UUID:
                                            characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                            break;
                                    }
                                })
                            } else {
                                reject('No characteristics found.');
                            }
                        });
                    });
                } else {
                    reject('No services found.');
                }
            });
        });
    }


    /**
     * disconnect from peripheral
     *
     * @param driver MiFloraDriver
     *
     * @returns {Promise.<object[]>}
     */
    discoverDevices(driver) {
        return new Promise((resolve, reject) => {
            let devices = [];
            let index = 0;

            let currentUuids = [];
            driver.getDevices().forEach(device => {
                let data = device.getData();
                currentUuids.push(data.uuid);
            });

            Homey.ManagerBLE.discover().then(function (advertisements) {
                advertisements = advertisements.filter(function (advertisement) {
                    return (currentUuids.indexOf(advertisement.uuid) === -1);
                });
                advertisements.forEach(function (advertisement) {
                    if (advertisement.localName === driver.getMiFloraBleIdentification()) {
                        ++index;
                        devices.push({
                            "name": driver.getMiFloraBleName() + " " + index,
                            "data": {
                                "id": advertisement.id,
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