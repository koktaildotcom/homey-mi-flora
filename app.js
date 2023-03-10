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

module.exports = class HomeyMiFlora extends Homey.App {

  /**
   * init the app
   */
  onInit() {
    console.log('Successfully init HomeyMiFlora version: %s', this.homey.manifest.version);
    this.devices = [];
    this.deviceSensorUpdated = this.homey.flow.getDeviceTriggerCard('device_sensor_updated');
    this.globalSensorUpdated = this.homey.flow.getTriggerCard('sensor_updated');
    this.deviceSensorChanged = this.homey.flow.getDeviceTriggerCard('device_sensor_changed');
    this.globalSensorChanged = this.homey.flow.getTriggerCard('sensor_changed');
    this.globalSensorTimeout = this.homey.flow.getTriggerCard('sensor_timeout');
    this.globalSensorThresholdMinExceeds = this.homey.flow.getTriggerCard('sensor_threshold_min_exceeds');
    this.deviceSensorThresholdMinExceeds = this.homey.flow.getDeviceTriggerCard('device_sensor_threshold_min_exceeds');
    this.globalSensorThresholdMaxExceeds = this.homey.flow.getTriggerCard('sensor_threshold_max_exceeds');
    this.deviceSensorThresholdMaxExceeds = this.homey.flow.getDeviceTriggerCard('device_sensor_threshold_max_exceeds');
    this.globalSensorOutsideThreshold = this.homey.flow.getTriggerCard('sensor_outside_threshold');
    this.deviceSensorOutsideThreshold = this.homey.flow.getDeviceTriggerCard('device_sensor_outside_threshold');
    this.updateDeviceAction = this.homey.flow.getActionCard('update_device');
    this.update = this.homey.flow.getActionCard('update');

    this.update.registerRunListener(async () => {
      try {
        return Promise.resolve(await this._synchroniseSensorData());
      } catch (error) {
        return Promise.reject(error);
      }
    });

    this._capabilityOptions = [
      'measure_temperature',
      'measure_luminance',
      'measure_nutrition',
      'measure_moisture',
      'measure_battery',
    ];
    this._conditionsMapping = {};
    this.thresholdMapping = {};
    this._capabilityOptions.forEach(capability => {
      if (this._capabilityOptions.indexOf(capability) !== -1 && capability !== 'measure_battery') {
        this._conditionsMapping[capability] = `${capability}_threshold`;
        this.thresholdMapping[capability] = {
          min: `${capability}_min`,
          max: `${capability}_max`,
        };
      }
    });

    for (const capability of this._capabilityOptions) {
      if (this._conditionsMapping.hasOwnProperty(capability)) {
        this.homey.flow.getConditionCard(this._conditionsMapping[capability])
          .registerRunListener(args => {
            const target = args.device;

            const mapping = this.thresholdMapping[capability];
            if (target && mapping.min && mapping.max) {
              const minValue = target.getSetting(mapping.min);
              const maxValue = target.getSetting(mapping.max);
              const value = target.getCapabilityValue(capability);

              console.log('%s < %s || %s > %s', value, minValue, value, maxValue);

              return (value < minValue || value > maxValue);
            }

            console.log('No device is attached to the flow card condition');
            console.log('dumping args:');
            console.log(args);

            return false;
          });
      }
    }

    this.updateDeviceAction
      .registerArgumentAutocompleteListener('sensor', async query => {
        const sensors = this.devices
          .map(device => {
            return {
              name: device.getName(),
              id: device.id,
            };
          });
        // @ts-ignore typescript gets confused on the mapping
        return sensors.filter(sensor => {
          return sensor.name.toLowerCase()
            .includes(query.toLowerCase());
        });
      })
      .registerRunListener(async data => {
        if (data.sensor !== null) {
          const target = this.devices.find(device => device.id === data.sensor.id);
          if (!target) {
            throw new Error(`Could not find device with id: ${data.sensor.id}`);
          }
          await this.updateDevice(target);
        }
      });

    if (!this.homey.settings.get('updateInterval')) {
      this.homey.settings.set('updateInterval', 15);
    }

    this.syncInProgress = false;
    this._setNewTimeout();
  }

  /**
   * @param device MiFloraDevice
   */
  registerDevice(device) {
    this.devices.push(device);
  }

  /**
   * @param device MiFloraDevice
   */
  unregisterDevice(device) {
    this.devices = this.devices.filter(current => current.id !== device.id);
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
      console.log('disconnectPeripheral not registered yet');
    };

    try {
      console.log('handleUpdateSequence');
      const updateDeviceTime = new Date();

      console.log('find');
      const advertisement = await this.homey.ble.find(device.getAddress(), 10000);

      console.log(`distance = ${this.calculateDistance(advertisement.rssi)} meter`);

      console.log('connect');
      const peripheral = await advertisement.connect();

      disconnectPeripheral = async () => {
        try {
          console.log('try to disconnect peripheral');
          if (peripheral.isConnected) {
            console.log('disconnect peripheral');
            return await peripheral.disconnect();
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
      const realtime = await characteristics.find(
        characteristic => characteristic.uuid === REALTIME_CHARACTERISTIC_UUID,
      );
      if (!realtime) {
        throw new Error('Missing realtime characteristic');
      }
      await realtime.write(Buffer.from([0xA0, 0x1F]));

      // get data
      console.log('data');
      const data = await characteristics.find(
        characteristic => characteristic.uuid === DATA_CHARACTERISTIC_UUID,
      );
      if (!data) {
        throw new Error('Missing data characteristic');
      }
      console.log('DATA_CHARACTERISTIC_UUID::read');
      const sensorData = await data.read();

      let temperature = sensorData.readUInt16LE(0);
      if (temperature > 65000) {
        temperature -= 65535;
      }

      const sensorValues = {
        measure_temperature: temperature / 10,
        measure_luminance: sensorData.readUInt32LE(3),
        measure_nutrition: sensorData.readUInt16LE(8),
        measure_moisture: sensorData.readUInt16BE(6),
      };

      console.log(sensorValues);

      await asyncForEach(device.getCapabilities(), async characteristic => {
        if (sensorValues.hasOwnProperty(characteristic)) {
          device.updateCapabilityValue(characteristic, sensorValues[characteristic]);
        }
      });

      // get firmware
      const firmware = characteristics.find(
        characteristic => characteristic.uuid === FIRMWARE_CHARACTERISTIC_UUID
      );
      if (!firmware) {
        disconnectPeripheral();
        throw new Error('Missing firmware characteristic');
      }
      console.log('FIRMWARE_CHARACTERISTIC_UUID::read');
      const firmwareData = await firmware.read();

      const batteryValue = parseInt(firmwareData.toString('hex', 0, 1), 16);
      const batteryValues = {
        measure_battery: batteryValue,
      };

      await asyncForEach(device.getCapabilities(), async characteristic => {
        if (batteryValues.hasOwnProperty(characteristic)) {
          device.updateCapabilityValue(characteristic, batteryValues[characteristic]);
        }
      });

      const firmwareVersion = firmwareData.toString('ascii', 2, firmwareData.length);

      await device.setSettings({
        firmware_version: firmwareVersion,
        last_updated: new Date().toISOString(),
        uuid: device.getData().uuid,
      });

      console.log({
        firmware_version: firmwareVersion,
        last_updated: new Date().toISOString(),
        uuid: device.getData().uuid,
        battery: batteryValue,
      });

      console.log('call disconnectPeripheral');
      await disconnectPeripheral();

      console.log(`Device sync complete in: ${(new Date() - updateDeviceTime) / 1000} seconds`);

      return device;
    } catch (error) {
      await disconnectPeripheral();
      console.log(error);
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
    console.log(' ');
    console.log(' ');
    console.log(' ');
    console.log(' ');
    console.log('-----------------------------------------------------------------');
    console.log('| New update sequence ');
    console.log('-----------------------------------------------------------------');
    return devices.reduce((promise, device) => {
      return promise
        .then(() => {
          console.log('reduce');
          device.retry = 0;
          return this.updateDevice(device);
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
    console.log(`# update device: ${device.getName()}`);
    console.log(`# firmware: ${device.getSetting('firmware_version')}`);
    console.log('#########################################');

    console.log('call handleUpdateSequence');

    if (!device.hasOwnProperty('retry') || device.retry === undefined) {
      device.retry = 0;
    }

    return await this.handleUpdateSequence(device)
      .then(() => {
        device.retry = 0;

        return device;
      })
      .catch(error => {
        device.retry++;
        console.log(`timeout, retry again ${device.retry}`);
        console.log(error);

        if (device.retry < MAX_RETRIES) {
          return this.updateDevice(device)
            .catch(e => {
              throw new Error(e);
            });
        }

        this.homey.app.globalSensorTimeout.trigger({
          deviceName: device.getName() ?? device.id,
          reason: error.message ?? 'Unknown error',
        })
          .then(() => {
            console.log('sending device timeout trigger');
          })
          .catch(e => {
            console.error('Cannot trigger flow card sensor_timeout device: %s.', e);
          });

        device.retry = 0;

        throw new Error(`Max retries (${MAX_RETRIES}) exceeded, no success`);
      });
  }

  /**
   * @private
   *
   * start the synchronisation
   */
  _synchroniseSensorDataTimeout() {
    this._synchroniseSensorData()
      .then(result => {
        this._setNewTimeout();
        console.log(result);
      })
      .catch(error => {
        this._setNewTimeout();
        console.error(error);
      });
  }

  /**
   * @private
   *
   * start the synchronisation
   */
  async _synchroniseSensorData() {
    if (this.syncInProgress === true) {
      throw new Error('Synchronisation already in progress, wait for it to be complete.');
    }

    let { devices } = this;

    const debugging = false;
    if (debugging) {
      if (this.devices.length !== 0) {
        devices = [];
        devices.push(this.devices[0], this.devices[1]);
      }
    }

    const updateDevicesTime = new Date();

    if (devices.length === 0) {
      throw new Error('No devices found to update.');
    }

    this.syncInProgress = true;
    return this.updateDevices(devices)
      .then(() => {
        this.syncInProgress = false;
        return `All devices are synced complete in: ${(new Date() - updateDevicesTime) / 1000} seconds`;
      })
      .catch(error => {
        this.syncInProgress = false;
        throw new Error(error);
      });
  }

  /**
   * @private
   *
   * set a new timeout for synchronisation
   */
  _setNewTimeout() {
    let updateInterval = this.homey.settings.get('updateInterval');

    if (!updateInterval) {
      updateInterval = 15;
      this.homey.settings.set('updateInterval', updateInterval);
    }

    const interval = 1000 * 60 * updateInterval;

    // @todo remove
    // test fast iteration timeout
    // const interval = 1000 * 5;

    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
    }

    this._syncTimeout = setTimeout(this._synchroniseSensorDataTimeout.bind(this), interval);

    this.syncInProgress = false;
  }

  /**
   * disconnect from peripheral
   *
   * @param driver MiFloraDriver
   *
   * @returns {Promise.<object[]>}
   */
  async discoverDevices(driver) {
    if (this.syncInProgress) {
      throw new Error(this.homey.__('pair.error.ble-unavailable'));
    }
    const { version } = this.homey.manifest;
    const devices = [];
    let index = driver.getDevices() ? driver.getDevices().length : 0;
    const currentUuids = [];
    driver.getDevices().forEach(device => {
      const data = device.getData();
      currentUuids.push(data.uuid);
    });
    return this.homey.ble.discover()
      .then(advertisements => {
        advertisements = advertisements.filter(advertisement => {
          return (currentUuids.indexOf(advertisement.uuid) === -1);
        });
        advertisements.forEach(advertisement => {
          if (advertisement.localName === driver.getMiFloraBleIdentification()) {
            ++index;
            devices.push({
              id: advertisement.uuid,
              name: `${driver.getMiFloraBleName()} ${index}`,
              data: {
                id: advertisement.id,
                uuid: advertisement.uuid,
                address: advertisement.uuid,
                name: advertisement.name,
                type: advertisement.type,
                version: `v${version}`,
              },
              settings: { uuid: advertisement.uuid, ...driver.getDefaultSettings() },
              capabilities: driver.getSupportedCapabilities(),
            });
          }
        });

        return devices;
      });
  }

  /**
   * @param rssi
   * @return {number}
   */
  calculateDistance(rssi) {
    const txPower = -59;
    const ratio = rssi / txPower;

    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    }

    return (0.19) * Math.pow(ratio, 8);
  }

};
