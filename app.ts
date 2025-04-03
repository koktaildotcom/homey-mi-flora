import { App, FlowCardAction, FlowCardTrigger, FlowCardTriggerDevice } from 'homey';
import MiFloraDevice from './lib/MiFloraDevice';
import MiFloraDriver from './lib/MiFloraDriver';
import { DeviceInfo } from './types/DeviceInfo';
import { CombinedCapabilities, DeviceCapabilities, FirmwareCapabilities } from './types/Capabilities';
import {
  ThresholdMap,
  CapabilityValuesMap, FirmwareValuesMap,
  ThresholdTranslationMapping
} from './types/MeasureCapabilityMap';
import moment from 'moment/moment';

const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const ADVERTISING_SERVICE_UUID = '0000fe95-0000-1000-8000-00805f9b34fb';

const MAX_RETRIES = 3;

export default class HomeyMiFloraApp extends App {
  private _devices: MiFloraDevice[] = [];
  private _capabilityOptions: string[] = [];
  private _conditionsMapping: Record<string, string> = {};
  private _syncTimeout: number | undefined;
  private _syncCounterTimeout: number | undefined;
  private _retryMap: Map<string, number> = new Map();
  private _enableDebugging = false;

  public thresholdMapping: ThresholdTranslationMapping = {
    [DeviceCapabilities.Temperature]: {
      min: 'measure_temperature_min',
      max: 'measure_temperature_max',
    },
    [DeviceCapabilities.Luminance]: {
      min: 'measure_luminance_min',
      max: 'measure_luminance_max',
    },
    [DeviceCapabilities.Nutrition]: {
      min: 'measure_nutrition_min',
      max: 'measure_nutrition_max',
    },
    [DeviceCapabilities.Moisture]: {
      min: 'measure_moisture_min',
      max: 'measure_moisture_max',
    },
    [FirmwareCapabilities.Battery]: {
      min: 'measure_battery_min',
      max: 'measure_battery_max',
    },
  };
  public syncInProgress: boolean | undefined;
  public updateDeviceAction: FlowCardAction | undefined;
  public update: FlowCardAction | undefined;
  public deviceSensorUpdated: FlowCardTriggerDevice | undefined;
  public globalSensorUpdated: FlowCardTrigger | undefined;
  public deviceSensorChanged: FlowCardTriggerDevice | undefined;
  public globalSensorChanged: FlowCardTrigger | undefined;
  public globalSensorTimeout: FlowCardTrigger | undefined;
  public globalSensorThresholdMinExceeds: FlowCardTrigger | undefined;
  public deviceSensorThresholdMinExceeds: FlowCardTriggerDevice | undefined;
  public globalSensorThresholdMaxExceeds: FlowCardTrigger | undefined;
  public deviceSensorThresholdMaxExceeds: FlowCardTriggerDevice | undefined;
  public globalSensorOutsideThreshold: FlowCardTrigger | undefined;
  public deviceSensorOutsideThreshold: FlowCardTriggerDevice | undefined;

  /**
   * init the app
   */
  async onInit(): Promise<void> {
    console.log('Successfully init HomeyMiFlora version: %s', this.homey.manifest.version);
    this._devices = [];
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
        await this._synchroniseSensorData();
        return Promise.resolve();
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

    this._capabilityOptions.forEach(capability => {
      if (this._capabilityOptions.indexOf(capability) !== -1 && capability !== 'measure_battery') {
        this._conditionsMapping[capability] = `${ capability }_threshold`;
        const capabilityAlias = capability as CombinedCapabilities;
        this.thresholdMapping[capabilityAlias] = {
          min: `${ capability }_min`,
          max: `${ capability }_max`,
        };
      }
    });

    for (const capability of this._capabilityOptions) {
      if (this._conditionsMapping.hasOwnProperty(capability)) {
        const capabilityAlias = capability as keyof ThresholdMap;
        this.homey.flow.getConditionCard(this._conditionsMapping[capabilityAlias])
          .registerRunListener(args => {
            const target = args.device;

            const mapping = this.thresholdMapping[capabilityAlias];
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

            return;
          });
      }
    }

    this.updateDeviceAction
      .registerArgumentAutocompleteListener('sensor', async query => {
        const sensors = this._devices
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
          const target = this._devices.find(device => device.id === data.sensor.id);
          if (!target) {
            throw new Error(`Could not find device with id: ${ data.sensor.id }`);
          }
          try {
            await this.updateDevice(target);
          } catch (error) {
            console.error(error);
          }
        }
      });

    if (!this.homey.settings.get('updateInterval')) {
      this.homey.settings.set('updateInterval', 15);
    }

    this.syncInProgress = false;
    await this._setNewTimeout();
  }

  async _updateCapabilitiesWithAdvertisedService() {
    if (!this.homey.settings.get('advertisedService')) {
      return;
    }

    type CapabilityMap = {
      [key in CombinedCapabilities]: number | undefined;
    }

    try {
      const advertisements = await this.homey.ble.discover();
      for (const adv of advertisements) {
        if (!Array.isArray(adv.serviceData)) continue;

        const fe95 = adv.serviceData.find(
          e => e.uuid?.toLowerCase() === ADVERTISING_SERVICE_UUID
        );

        if (!fe95 || !Buffer.isBuffer(fe95.data)) continue;

        const data = fe95.data;
        const macBuffer = data.slice(5, 11);

        const id = Array.from(macBuffer)
          .reverse()
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        let index = 12;
        while (index + 3 <= data.length) {
          const type = data.readUInt16LE(index);
          const length = data[index + 2];
          if (index + 3 + length > data.length) break;
          const valueBuf = data.slice(index + 3, index + 3 + length);

          let sensorValues: CapabilityMap = {
            [DeviceCapabilities.Temperature]: undefined,
            [DeviceCapabilities.Luminance]: undefined,
            [DeviceCapabilities.Nutrition]: undefined,
            [DeviceCapabilities.Moisture]: undefined,
            [FirmwareCapabilities.Battery]: undefined,
          };

          switch (type) {
            case 0x1004:
              if (length === 2) sensorValues[DeviceCapabilities.Temperature] = valueBuf.readUInt16LE(0) / 10;
              break;

            case 0x1007:
              if (length === 3) sensorValues[DeviceCapabilities.Luminance] = valueBuf.readUInt16LE(0);
              break;

            case 0x1008:
              if (length === 1) sensorValues[DeviceCapabilities.Moisture] = valueBuf[0];
              break;

            case 0x1009:
              if (length === 2) {
                sensorValues[DeviceCapabilities.Nutrition] = valueBuf.readUInt16LE(0);
              }
              break;

            case 0x1006:
              if (length === 1) sensorValues[FirmwareCapabilities.Battery] = valueBuf[0];
              break;
          }

          const device: MiFloraDevice | undefined = this._devices.find(current => current.id === id);

          if (device) {
            await this.asyncForEach(device.getCapabilities(), async characteristic => {
              const characteristicAlias = characteristic as DeviceCapabilities;
              if (sensorValues.hasOwnProperty(characteristic) && sensorValues[characteristicAlias] !== undefined) {
                if (this._enableDebugging) {
                  console.log(`update ${ characteristic } to ${ sensorValues[characteristicAlias] } for ${ device.getName() }`);
                }
                await device.updateCapabilityValue(characteristic, sensorValues[characteristicAlias]);
              }
            });
          }

          index += 3 + length;
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * @return device MiFloraDevice
   */
  getDevices() {
    if (this._enableDebugging) {
      return [this._devices[0], this._devices[1]];
    }

    return this._devices;
  }

  getDeviceLastUpdate(date: string): string {
    moment.locale(this.homey.i18n.getLanguage());
    return moment(date).fromNow();
  }

  /**
   * @param device MiFloraDevice
   */
  registerDevice(device: MiFloraDevice) {
    this._devices.push(device);
  }

  /**
   * @param device MiFloraDevice
   */
  unregisterDevice(device: MiFloraDevice) {
    this._devices = this._devices.filter(current => current.id !== device.id);
  }

  /**
   * connect to the sensor, update data and disconnect
   *
   * @param device MiFloraDevice
   *
   * @returns {Promise.<MiFloraDevice>}
   */
  async handleUpdateSequence(device: MiFloraDevice): Promise<MiFloraDevice | Error> {
    let disconnectPeripheral = async (): Promise<never | void> => {
      console.error('disconnectPeripheral not registered yet');
    };

    try {
      console.log('handleUpdateSequence');
      const updateDeviceTime = new Date();

      console.log('find');
      const advertisement = await this.homey.ble.find(device.getAddress(), 10000);

      console.log(`distance = ${ this.calculateDistance(advertisement.rssi) } meter`);

      console.log('connect');
      const peripheral = await advertisement.connect();

      console.log('try to disconnect peripheral');
      disconnectPeripheral = async () => {
        console.log('try to disconnect peripheral');
        if (peripheral.isConnected) {
          console.log('disconnect peripheral');
          await peripheral.disconnect();
        }
      };

      const services = await peripheral.discoverServices();

      console.log('dataService');
      const dataService = services.find(service => service.uuid === DATA_SERVICE_UUID);
      if (!dataService) {
        await disconnectPeripheral();
        throw new Error('Missing dataService service');
      }
      const characteristics = await dataService.discoverCharacteristics();

      // get realtime
      console.log('realtime');
      const realtime = characteristics.find(
        characteristic => characteristic.uuid === REALTIME_CHARACTERISTIC_UUID,
      );
      if (!realtime) {
        await disconnectPeripheral();
        throw new Error('Missing realtime service');
      }
      await realtime.write(Buffer.from([0xA0, 0x1F]));

      // get data
      console.log('data');
      const data = characteristics.find(
        characteristic => characteristic.uuid === DATA_CHARACTERISTIC_UUID,
      );
      if (!data) {
        await disconnectPeripheral();
        throw new Error('Missing data service');
      }
      console.log('DATA_CHARACTERISTIC_UUID::read');
      const sensorData = await data.read();

      let temperature = sensorData.readUInt16LE(0);
      if (temperature > 65000) {
        temperature -= 65535;
      }

      const sensorValues: CapabilityValuesMap = {
        [DeviceCapabilities.Temperature]: temperature / 10,
        [DeviceCapabilities.Luminance]: sensorData.readUInt32LE(3),
        [DeviceCapabilities.Nutrition]: sensorData.readUInt16LE(8),
        [DeviceCapabilities.Moisture]: sensorData.readUInt16BE(6),
      };

      console.log(sensorValues);

      await this.asyncForEach(device.getCapabilities(), async characteristic => {
        if (sensorValues.hasOwnProperty(characteristic)) {
          const characteristicAlias = characteristic as DeviceCapabilities;
          await device.updateCapabilityValue(characteristic, sensorValues[characteristicAlias]);
        }
      });

      // get firmware
      const firmware = characteristics.find(
        characteristic => characteristic.uuid === FIRMWARE_CHARACTERISTIC_UUID
      );
      if (!firmware) {
        await disconnectPeripheral();
        throw new Error('Missing firmware service');
      }
      console.log('FIRMWARE_CHARACTERISTIC_UUID::read');
      const firmwareData = await firmware.read();

      const batteryValues: FirmwareValuesMap = {
        [FirmwareCapabilities.Battery]: parseInt(firmwareData.toString('hex', 0, 1), 16),
      };

      await this.asyncForEach(device.getCapabilities(), async characteristic => {
        if (batteryValues.hasOwnProperty(characteristic)) {
          const characteristicAlias = characteristic as FirmwareCapabilities;
          await device.updateCapabilityValue(characteristic, batteryValues[characteristicAlias]);
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
        battery: batteryValues,
      });

      console.log(`Device sync complete in: ${ ((new Date()).getTime() - updateDeviceTime.getTime()) / 1000 } seconds`);

      return device;
    } catch (error) {
      await disconnectPeripheral();
      console.log(error);
      throw error;
    }
  }

  /**
   * update the _devices one by one
   *
   * @param devices MiFloraDevice[]
   *
   * @returns {Promise.<MiFloraDevice[]>}
   */
  async updateDevices(devices: MiFloraDevice[]): Promise<void | MiFloraDevice> {
    console.log(' ');
    console.log(' ');
    console.log(' ');
    console.log(' ');
    console.log('-----------------------------------------------------------------');
    console.log('| New update sequence ');
    console.log('-----------------------------------------------------------------');
    return devices.reduce(async (promise: Promise<void | MiFloraDevice>, device: MiFloraDevice): Promise<void | MiFloraDevice> => {
      try {
        await promise;
        console.log('reduce');
        device.retry = 0;
        return await this.updateDevice(device);
      } catch (error) {
        console.log('update devices error');
        console.log(error);
      }
    }, Promise.resolve());
  }

  /**
   * update the _devices one by one
   */
  async updateDevice(device: MiFloraDevice): Promise<MiFloraDevice> {
    console.log('#########################################');
    console.log(`# update device: ${ device.getName() }`);
    console.log(`# firmware: ${ device.getSetting('firmware_version') }`);
    console.log('#########################################');

    if (!this._retryMap.has(device.id)) {
      this._retryMap.set(device.id, 0);
    }

    return await this.handleUpdateSequence(device)
      .then(() => {
        this._retryMap.set(device.id, 0);
        return device;
      })
      .catch(async error => {
        this._retryMap.set(device.id, (this._retryMap.get(device.id) ?? 0) + 1);
        console.log(`timeout, retry again ${ this._retryMap.get(device.id) }`);
        console.log(error);

        if ((this._retryMap.get(device.id) ?? 0) < MAX_RETRIES) {
          return await this.updateDevice(device);
        }

        this.globalSensorTimeout?.trigger({
          deviceName: device.getName() ?? device.id,
          reason: error.message ?? 'Unknown error',
        })
          .then(() => {
            console.log('sending device timeout trigger');
          })
          .catch(e => {
            console.error('Cannot trigger flow card sensor_timeout device: %s.', e);
          });

        this._retryMap.set(device.id, 0);

        throw new Error(`Max retries (${ MAX_RETRIES }) exceeded, no success`);
      });
  }

  /**
   * @private
   *
   * start the synchronisation
   */
  async _synchroniseSensorDataTimeout() {
    await this._synchroniseSensorData();
    await this._setNewTimeout();
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

    const updateDevicesTime = new Date();

    if (this.getDevices().length === 0) {
      this.syncInProgress = false;
      console.log('No devices found to update.');
      return;
    }

    this.syncInProgress = true;
    return this.updateDevices(this.getDevices())
      .then(() => {
        this.syncInProgress = false;
        console.log(`All devices are synced complete in: ${ (new Date().getTime() - updateDevicesTime.getTime()) / 1000 } seconds`);
      })
      .catch(error => {
        this.syncInProgress = false;
        console.log(error);
      });
  }

  /**
   * @private
   *
   * set a new timeout for synchronisation
   */
  async _setNewTimeout() {
    let updateInterval = this.homey.settings.get('updateInterval');

    if (!updateInterval) {
      updateInterval = 60;
      this.homey.settings.set('updateInterval', updateInterval);
    }

    const interval = 1000 * (this._enableDebugging ? 2 : 60 * updateInterval);
    const nextUpdateAt = new Date().getTime() + interval;

    if (this._syncTimeout) {
      this.homey.clearTimeout(this._syncTimeout);
      this.homey.clearInterval(this._syncCounterTimeout);
    }

    this._syncCounterTimeout = this.homey.setInterval(() => {
      const now = new Date().getTime();
      const timeRemaining = nextUpdateAt - now;

      const minutes = Math.floor(timeRemaining / 1000 / 60);
      const seconds = Math.floor((timeRemaining / 1000) % 60);

      console.log(`Synchronizing in: ${ minutes } minute(s) and ${ seconds } second(s)`);
    }, 1000 * 60) as unknown as number;

    this.homey.setInterval(this._updateCapabilitiesWithAdvertisedService.bind(this), 1000 * 5);
    this._syncTimeout = this.homey.setTimeout(this._synchroniseSensorDataTimeout.bind(this), interval) as unknown as number;

    this.syncInProgress = false;
  }

  async discoverDevices(driver: MiFloraDriver): Promise<DeviceInfo[]> {
    if (this.syncInProgress) {
      throw new Error(this.homey.__('pair.error.ble-unavailable'));
    }
    const { version } = this.homey.manifest;
    const devices: DeviceInfo[] = [];
    let index = driver.getDevices() ? driver.getDevices().length : 0;
    const currentUuids: string[] = [];
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
              name: `${ driver.getMiFloraBleName() } ${ index }`,
              data: {
                id: advertisement.id,
                uuid: advertisement.uuid,
                address: advertisement.uuid,
                // name: advertisement.name,
                // type: advertisement.type,
                version: `v${ version }`,
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
  calculateDistance(rssi: number): number {
    const txPower = -59;
    const ratio = rssi / txPower;

    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    }

    return (0.19) * Math.pow(ratio, 8);
  }


  async asyncForEach(array: string[], callback: (value: any, index: number, array: string[]) => Promise<void>): Promise<void> {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
}

module.exports = HomeyMiFloraApp;
