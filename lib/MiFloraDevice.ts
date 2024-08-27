import Homey from 'homey';
import HomeyMiFloraApp from '../app';
import { MiFloraDriver } from './MiFloraDriver';

export class MiFloraDevice extends Homey.Device {
  private _id: string;
  private _retry: number;

  /**
   * on init the device
   */
  async onInit() {
    const settings = this.getSettings();
    const version = settings['app_version'];

    if (!version) {
      if (this.hasCapability('measure_moisture') === false) {
        await this.addCapability('measure_moisture');
        const min = settings['flora_measure_moisture_min'];
        const max = settings['flora_measure_moisture_max'];
        await this.setSettings({
          measure_moisture_min: min,
          measure_moisture_max: max,
        });
      }
      if (this.hasCapability('measure_nutrition') === false) {
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

    const defaultSettings = {
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
    };

    if (this.getApp().thresholdMapping) {
      for (const capability in this.getApp().thresholdMapping) {
        if (this.getApp().thresholdMapping.hasOwnProperty(capability) && defaultSettings.hasOwnProperty(capability)) {
          const mapping = this.getApp().thresholdMapping[capability];
          const defaults = defaultSettings[capability];
          if (this.getSetting(mapping.min) === '0') {
            const object = {};
            object[mapping.min] = defaults.min;
            this.setSettings(object);
          }
          if (this.getSetting(mapping.max) === '0') {
            const object = {};
            object[mapping.max] = defaults.max;
            this.setSettings(object);
          }
        }
      }
    }

    this.getApp().registerDevice(this);

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
   *
   * @param capability
   * @param value
   */
  updateCapabilityValue(capability, value) {
    const currentValue = this.getCapabilityValue(capability);

    this.getApp().globalSensorUpdated.trigger({
      deviceName: this.getName(),
      sensor: this.homey.__(`capability.${ capability }.name`),
      report: this.homey.__(`capability.${ capability }.device_updated`, {
        value,
        plant: this.getName(),
      }),
      value: `${ value }`,
      numeric: parseFloat(value),
    })
      .then(() => {
        // console.log('Successful triggered flow card globalSensorUpdated global.');
      })
      .catch(error => {
        console.log('Cannot trigger flow card globalSensorUpdated global: %s.', error);
      });

    this.getApp().globalSensorChanged.trigger({
      deviceName: this.getName(),
      sensor: this.homey.__(`capability.${ capability }.name`),
      report: this.homey.__(`capability.${ capability }.device_changed`, {
        value,
        plant: this.getName(),
      }),
      value: `${ value }`,
      numeric: parseFloat(value),
    })
      .then(() => {
        // console.log('Successful triggered flow card globalSensorChanged.');
      })
      .catch(error => {
        console.error('Cannot trigger flow card globalSensorChanged device: %s.', error);
      });

    this._checkThresholdTrigger(capability, value);

    if (currentValue !== value) {
      this.setCapabilityValue(capability, value).catch(console.error);

      this.getApp().deviceSensorUpdated.trigger(this, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report: this.homey.__(`capability.${ capability }.device_updated`, {
          value,
          plant: this.getName(),
        }),
        value: `${ value }`,
        numeric: parseFloat(value),
      })
        .then(() => {
          // console.log('Successful triggered flow deviceSensorUpdated sensor_changed.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorUpdated device: %s.', error);
        });

      this.getApp().deviceSensorChanged.trigger(this, {
        sensor: this.homey.__(`capability.${ capability }.name`),
        report: this.homey.__(`capability.${ capability }.device_changed`, {
          value,
          plant: this.getName(),
        }),
        value: `${ value }`,
        numeric: parseFloat(value),
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
   *
   * @return string
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
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (this.getApp().thresholdMapping) {
      for (const capability in this.getApp().thresholdMapping) {
        if (this.getApp().thresholdMapping.hasOwnProperty(capability)) {
          const mapping = this.getApp().thresholdMapping[capability];
          if (newSettings.hasOwnProperty(mapping.min) && newSettings.hasOwnProperty(mapping.max)) {
            const minValue = newSettings[mapping.min];
            const maxValue = newSettings[mapping.max];
            if (minValue >= maxValue) {
              return this.homey.__('settings.error.threshold', { capability: this.homey.__(`capability.${ capability }.name`) });
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * @private
   *
   * emit the registered triggers
   *
   * @param capability
   * @param value
   */
  _checkThresholdTrigger(capability, value) {
    if (this.getApp().thresholdMapping && this.getApp().thresholdMapping.hasOwnProperty(capability)) {
      const minValue = this.getSetting(this.getApp().thresholdMapping[capability].min);
      const maxValue = this.getSetting(this.getApp().thresholdMapping[capability].max);

      if (value < minValue) {
        if (this.hasCapability(capability.replace('measure_', 'alarm_'))) {
          this.setCapabilityValue(capability.replace('measure_', 'alarm_'), true);
        }

        const report = this.homey.__(`capability.${ capability }.threshold.min`, {
          value,
          min: minValue,
          plant: this.getName(),
        });

        this.getApp().globalSensorOutsideThreshold.trigger({
          deviceName: this.getName(),
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
          });

        this.getApp().deviceSensorOutsideThreshold.trigger(this, {
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
          });

        this.getApp().globalSensorThresholdMinExceeds.trigger({
          deviceName: this.getName(),
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorThresholdMinExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorThresholdMinExceeds: %s.', error);
          });

        this.getApp().deviceSensorThresholdMinExceeds.trigger(this, {
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorThresholdMinExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorThresholdMinExceeds: %s.', error);
          });
      }
      if (value > maxValue) {
        if (this.hasCapability(capability.replace('measure_', 'alarm_'))) {
          this.setCapabilityValue(capability.replace('measure_', 'alarm_'), true);
        }
        const report = this.homey.__(`capability.${ capability }.threshold.max`, {
          value,
          max: maxValue,
          plant: this.getName(),
        });

        this.getApp().globalSensorOutsideThreshold.trigger({
          deviceName: this.getName(),
          report,
          sensor: this.homey.__(`capability.${ capability }.name`),
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
          });

        this.getApp().deviceSensorOutsideThreshold.trigger(this, {
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
          });

        this.getApp().globalSensorThresholdMaxExceeds.trigger({
          deviceName: this.getName(),
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorThresholdMaxExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorThresholdMaxExceeds: %s.', error);
          });

        this.getApp().deviceSensorThresholdMaxExceeds.trigger(this, {
          sensor: this.homey.__(`capability.${ capability }.name`),
          report,
          value: `${ value }`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorThresholdMaxExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorThresholdMaxExceeds: %s.', error);
          });
      }
      if (value >= minValue && value <= maxValue) {
        if (this.hasCapability(capability.replace('measure_', 'alarm_'))) {
          this.setCapabilityValue(capability.replace('measure_', 'alarm_'), false);
        }
      }
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

  /**
   * @param property
   *
   * @returns {Promise.<*>}
   */
  async getDeviceData(property: string): Promise<string> {
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
