import Homey, { Device } from 'homey';
import { ThresholdMap } from '../types/MeasureCapabilityMap';
import HomeyMiFloraApp from '../app';
import MiFloraDriver from './MiFloraDriver';
import { CombinedCapabilities } from '../types/Capabilities';

export default class MiFloraDevice extends Homey.Device {
  private _id: string = '';
  private _retry: number = 0;

  /**
   * on init the device
   */
  async onInit() {
    const settings = this.getSettings();
    const version = settings['app_version'];

    if (!version) {
      if (!this.hasCapability('measure_moisture')) {
        await this.addCapability('measure_moisture');
        const min = settings['flora_measure_moisture_min'];
        const max = settings['flora_measure_moisture_max'];
        await this.setSettings({
          measure_moisture_min: min,
          measure_moisture_max: max,
        });
      }
      if (!this.hasCapability('measure_nutrition')) {
        await this.addCapability('measure_nutrition');
        const min = settings['flora_measure_fertility_min'];
        const max = settings['flora_measure_fertility_max'];
        await this.setSettings({
          measure_nutrition_min: min,
          measure_nutrition_max: max,
        });
      }

      if (this.hasCapability('flora_measure_moisture')) {
        await this.removeCapability('flora_measure_moisture');
      }
      if (this.hasCapability('flora_measure_fertility')) {
        await this.removeCapability('flora_measure_fertility');
      }

      await this.setSettings({ app_version: '4.0.0' });
    }

    this._id = await this.getDeviceData('id');

    const defaultSettings: ThresholdMap = {
      measure_temperature: {
        min: 10,
        max: 30,
      },
      measure_luminance: {
        min: 500,
        max: 2000,
      },
      measure_nutrition: {
        min: 350,
        max: 1500,
      },
      measure_moisture: {
        min: 15,
        max: 30,
      },
      measure_battery: {
        min: 20,
        max: 100,
      },
    };

    const app = this.getApp();
    if (app && app.thresholdMapping) {
      for (const capability in app.thresholdMapping) {
        if (app.thresholdMapping.hasOwnProperty(capability) && defaultSettings.hasOwnProperty(capability)) {
          const capabilityAlias = capability as keyof ThresholdMap;
          const mapping = app.thresholdMapping[capabilityAlias];
          const defaults = defaultSettings[capabilityAlias];
          if (this.getSetting(mapping.min) === '0') {
            await this.setSettings({
              [mapping.min]: defaults.min,
            });
          }
          if (this.getSetting(mapping.max) === '0') {
            await this.setSettings({
              [mapping.max]: defaults.max,
            });
          }
        }
      }
    }

    app.registerDevice(this);

    if (this.getDriver().getSupportedCapabilities().includes('alarm_temperature') && !this.hasCapability('alarm_temperature')) {
      await this.addCapability('alarm_temperature');
    }
    if (this.getDriver().getSupportedCapabilities().includes('alarm_luminance') && !this.hasCapability('alarm_luminance')) {
      await this.addCapability('alarm_luminance');
    }
    if (this.getDriver().getSupportedCapabilities().includes('alarm_nutrition') && !this.hasCapability('alarm_nutrition')) {
      await this.addCapability('alarm_nutrition');
    }
    if (this.getDriver().getSupportedCapabilities().includes('alarm_moisture') && !this.hasCapability('alarm_moisture')) {
      await this.addCapability('alarm_moisture');
    }

    await super.onInit();
  }

  /**
   * update the detected sensor values and emit the triggers
   */
  async updateCapabilityValue(capability: string, value: number | string) {
    const currentValue = this.getCapabilityValue(capability);

    this.getApp()?.globalSensorUpdated?.trigger({
      deviceName: this.getName(),
      sensor: this.homey.__(`capability.${ capability }.name`),
      report: this.homey.__(`capability.${ capability }.device_updated`, {
        value,
        plant: this.getName(),
      }),
      value: `${ value }`,
      numeric: value,
    })
      .then(() => {
        // console.log('Successful triggered flow card globalSensorUpdated global.');
      })
      .catch(error => {
        console.log('Cannot trigger flow card globalSensorUpdated global: %s.', error);
      });

    this.getApp()?.globalSensorChanged?.trigger({
      deviceName: this.getName(),
      sensor: this.homey.__(`capability.${ capability }.name`),
      report: this.homey.__(`capability.${ capability }.device_changed`, {
        value,
        plant: this.getName(),
      }),
      value: `${ value }`,
      numeric: value,
    })
      .then(() => {
        // console.log('Successful triggered flow card globalSensorChanged.');
      })
      .catch(error => {
        console.error('Cannot trigger flow card globalSensorChanged device: %s.', error);
      });

    await this._checkThresholdTrigger(capability, value);

    this.setCapabilityValue(capability, value).catch(console.error);

    if (currentValue !== value) {

      this.getApp().deviceSensorUpdated?.trigger(this as Device, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report: this.homey.__(`capability.${ capability }.device_updated`, {
          value,
          plant: this.getName(),
        }),
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow deviceSensorUpdated sensor_changed.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorUpdated device: %s.', error);
        });

      this.getApp().deviceSensorChanged?.trigger(this as Device, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report: this.homey.__(`capability.${ capability }.device_changed`, {
          value,
          plant: this.getName(),
        }),
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card deviceSensorChanged global.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorChanged global: %s.', error);
        });
    }
  }

  /**
   * wrapper for make the app backwards compatible
   */
  getAddress() {
    const data = this.getData();
    if (data.uuid) {
      return data.uuid;
    }
    if (data.address) {
      return data.address;
    }
  }

  /**
   * on settings change
   */
  async onSettings({ newSettings }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    for (const capability in this.getApp().thresholdMapping) {
      if (this.getApp().thresholdMapping.hasOwnProperty(capability)) {
        const capabilityAlias = capability as keyof ThresholdMap;
        const mapping = this.getApp().thresholdMapping[capabilityAlias];
        if (newSettings.hasOwnProperty(mapping.min) && newSettings.hasOwnProperty(mapping.max)) {
          const minValue = newSettings[mapping.min];
          const maxValue = newSettings[mapping.max];
          if (minValue && maxValue && minValue >= maxValue) {
            return this.homey.__('settings.error.threshold', { capability: this.homey.__(`capability.${ capability }.name`) });
          }
        }
      }
    }

    return;
  }

  /**
   * emit the registered triggers
   */
  async _checkThresholdTrigger(capability: string, value: string | number) {
    const capabilityAlias = capability as CombinedCapabilities;
    const minValue = this.getSetting(this.getApp().thresholdMapping[capabilityAlias].min);
    const maxValue = this.getSetting(this.getApp().thresholdMapping[capabilityAlias].max);

    let hasError = false;

    if (!value || !minValue || !maxValue) {
      return;
    }

    if (value < minValue) {
      hasError = true;

      const report = this.homey.__(`capability.${ capability }.threshold.min`, {
        value,
        min: minValue,
        plant: this.getName(),
      });

      this.getApp()?.globalSensorOutsideThreshold?.trigger({
        deviceName: this.getName(),
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card globalSensorOutsideThreshold.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
        });

      this.getApp().deviceSensorOutsideThreshold?.trigger(this, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
        });

      this.getApp()?.globalSensorThresholdMinExceeds?.trigger({
        deviceName: this.getName(),
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card globalSensorThresholdMinExceeds.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card globalSensorThresholdMinExceeds: %s.', error);
        });

      this.getApp().deviceSensorThresholdMinExceeds?.trigger(this, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card deviceSensorThresholdMinExceeds.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorThresholdMinExceeds: %s.', error);
        });
    }
    if (value > maxValue) {
      hasError = true;

      const report = this.homey.__(`capability.${ capability }.threshold.max`, {
        value,
        max: maxValue,
        plant: this.getName(),
      });

      this.getApp()?.globalSensorOutsideThreshold?.trigger({
        deviceName: this.getName(),
        report,
        sensor: this.homey.__(`capability.${ capability }.name`),
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card globalSensorOutsideThreshold.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
        });

      this.getApp().deviceSensorOutsideThreshold?.trigger(this, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
        });

      this.getApp()?.globalSensorThresholdMaxExceeds?.trigger({
        deviceName: this.getName(),
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card globalSensorThresholdMaxExceeds.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card globalSensorThresholdMaxExceeds: %s.', error);
        });

      this.getApp().deviceSensorThresholdMaxExceeds?.trigger(this, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report,
        value: `${ value }`,
        numeric: value,
      })
        .then(() => {
          // console.log('Successful triggered flow card deviceSensorThresholdMaxExceeds.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorThresholdMaxExceeds: %s.', error);
        });
    }

    if (this.hasCapability(capability.replace('measure_', 'alarm_'))) {
      await this.setCapabilityValue(capability.replace('measure_', 'alarm_'), hasError);
    }
  }

  /**
   * Update the device on add
   */
  onAdded() {
    this.getApp().registerDevice(this);
    this.getApp().updateDevice(this);
  }

  /**
   * Unregister device
   */
  onDeleted() {
    this.getApp().unregisterDevice(this);
  }

  async getDeviceData(property: string): Promise<any> {
    const deviceData = await this.getData();
    if (Object.prototype.hasOwnProperty.call(deviceData, property)) {
      return deviceData[property];
    }
  }

  get id(): string {
    return this._id;
  }

  get retry(): number {
    return this._retry;
  }

  set retry(value: number) {
    this._retry = value;
  }

  getApp(): HomeyMiFloraApp {
    return this.homey.app as HomeyMiFloraApp;
  }

  getDriver(): MiFloraDriver {
    return this.driver as MiFloraDriver;
  }
}

module.exports = MiFloraDevice;
