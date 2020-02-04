'use strict';

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

        if (!Homey.ManagerSettings.get('updateInterval')) {
            Homey.ManagerSettings.set('updateInterval', 15)
        }
    }

    /**
     * find advertisements
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<BleAdvertisement>}
     */
    async find(device) {
        return await Homey.ManagerBLE.find(device.getAddress()).then(function (advertisement) {
            return advertisement;
        });
    }

    /**
     * connect to the sensor, update data and disconnect
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    async handleUpdateSequence(device) {

        let disconnectPeripheral = async () => {
            console.log('disconnectPeripheral not registered yet')
        };

        try {
            console.log('handleUpdateSequence');
            let updateDeviceTime = new Date();

            console.log('find');
            const advertisement = await Homey.app.find(device);

            console.log('connect');
            const peripheral = await advertisement.connect();

            disconnectPeripheral = async () => {
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

            const services = await peripheral.discoverServices();

            console.log('dataService');
            const dataService = await services.find(service => service.uuid === DATA_SERVICE_UUID);
            if (!dataService) {
                throw new Error('Missing data service');
            }
            const characteristics = await dataService.discoverCharacteristics();

            // get realtime
            console.log('realtime');
            const realtime = await characteristics.find(characteristic => characteristic.uuid === REALTIME_CHARACTERISTIC_UUID);
            if(!realtime) {
                throw new Error('Missing realtime characteristic');
            }
            await realtime.write(Buffer.from([0xA0, 0x1F]));

            // get data
            console.log('data');
            const data = await characteristics.find(characteristic => characteristic.uuid === DATA_CHARACTERISTIC_UUID);
            if(!data) {
                throw new Error('Missing data characteristic');
            }
            console.log('DATA_CHARACTERISTIC_UUID::read');
            const sensorData = await data.read();

            let sensorValues = {
                'measure_temperature': sensorData.readUInt16LE(0) / 10,
                'measure_luminance': sensorData.readUInt32LE(3),
                'flora_measure_fertility': sensorData.readUInt16LE(8),
                'flora_measure_moisture': sensorData.readUInt16BE(6)
            }
            console.log(sensorValues);

            await asyncForEach(device.getCapabilities(), async (characteristic) => {
                if (sensorValues.hasOwnProperty(characteristic)) {
                    device.updateCapabilityValue(characteristic, sensorValues[characteristic]);
                }
            });

            // get firmware
            const firmware = characteristics.find(characteristic => characteristic.uuid === FIRMWARE_CHARACTERISTIC_UUID);
            if(!firmware) {
                disconnectPeripheral();
                throw new Error('Missing firmware characteristic');
            }
            console.log('FIRMWARE_CHARACTERISTIC_UUID::read');
            const firmwareData = await firmware.read();

            const batteryValue = parseInt(firmwareData.toString('hex', 0, 1), 16);
            const batteryValues = {
                'measure_battery': batteryValue
            };

            await asyncForEach(device.getCapabilities(), async (characteristic) => {
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
     * update the devices one by one
     *
     * @param devices MiFloraDevice[]
     *
     * @returns {Promise.<MiFloraDevice[]>}
     */
    async updateDevices(devices) {
        console.log('_updateDevices');
        return await devices.reduce((promise, device) => {
            return promise
            .then(() => {
                console.log('reduce');
                device.retry = 0;
                return Homey.app.updateDevice(device)
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
    async updateDevice(device) {

        console.log('#########################################');
        console.log('# update device: '+device.getName());
        console.log('#########################################');

        console.log('call handleUpdateSequence');

        if (device.retry === undefined) {
            device.retry = 0;
        }

        return await Homey.app.handleUpdateSequence(device)
        .then(() => {
            device.retry = 0;

            return device;
        })
        .catch(error => {
            device.retry++;
            console.log('timeout, retry again ' + device.retry);
            console.log(error);

            if (device.retry < MAX_RETRIES) {
                return Homey.app.updateDevice(device)
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

            device.retry = 0;

            throw new Error('Max retries (' + MAX_RETRIES + ') exceeded, no success');
        });
    }

    /**
     * update the devices one by one
     *
     * @param device MiFloraDevice
     *
     * @returns {Promise.<MiFloraDevice>}
     */
    async identify (device) {

        let disconnectPeripheral = async () => {
            console.log('disconnectPeripheral not registered yet')
        };

        try {
            console.log('find')
            const advertisement = await Homey.app.find(device)

            console.log('connect')
            const peripheral = await advertisement.connect()

            disconnectPeripheral = async () => {
                try {
                    console.log('try to disconnect peripheral')
                    if (peripheral.isConnected) {
                        console.log('disconnect peripheral')
                        return await peripheral.disconnect()
                    }
                } catch (err) {
                    throw new Error(err)
                }
            }

            console.log('get dataService')
            const dataService = await peripheral.getService(DATA_SERVICE_UUID)

            console.log('blink');
            await dataService.write(Buffer.from([0xfd, 0xff]));

            console.log('call disconnectPeripheral')
            await disconnectPeripheral()

            return device
        }
        catch (error) {
            await disconnectPeripheral()

            throw error
        }
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
