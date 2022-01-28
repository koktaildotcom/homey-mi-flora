'use strict';

const Homey = require('homey');

module.exports = class MiFloraDevice extends Homey.Device {

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

    this.id = await this.getDeviceData('id');

    if (!this.hasCapability('measure_battery')) {
      await this.addCapability('measure_battery');
    }

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

    if (this.homey.app.thresholdMapping) {
      for (const capability in this.homey.app.thresholdMapping) {
        if (this.homey.app.thresholdMapping.hasOwnProperty(capability) && defaultSettings.hasOwnProperty(capability)) {
          const mapping = this.homey.app.thresholdMapping[capability];
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

    this.homey.app.registerDevice(this);
  }

  /**
   * update the detected sensor values and emit the triggers
   *
   * @param capability
   * @param value
   */
  updateCapabilityValue(capability, value) {
    const currentValue = this.getCapabilityValue(capability);

    this.homey.app.globalSensorUpdated.trigger({
      deviceName: this.getName(),
      sensor: this.homey.__(`capability.${capability}.name`),
      report: this.homey.__(`capability.${capability}.device_updated`, {
        value,
        plant: this.getName(),
      }),
      value: `${value}`,
      numeric: parseFloat(value),
    })
      .then(() => {
        // console.log('Successful triggered flow card globalSensorUpdated global.');
      })
      .catch(error => {
        console.log('Cannot trigger flow card globalSensorUpdated global: %s.', error);
      });

    this.homey.app.globalSensorChanged.trigger({
      deviceName: this.getName(),
      sensor: this.homey.__(`capability.${capability}.name`),
      report: this.homey.__(`capability.${capability}.device_changed`, {
        value,
        plant: this.getName(),
      }),
      value: `${value}`,
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
      this.setCapabilityValue(capability, value);

      this.homey.app.deviceSensorUpdated.trigger(this, {
        sensor: this.homey.__(`capability.${capability}.name`),
        report: this.homey.__(`capability.${capability}.device_updated`, {
          value,
          plant: this.getName(),
        }),
        value: `${value}`,
        numeric: parseFloat(value),
      })
        .then(() => {
          // console.log('Successful triggered flow deviceSensorUpdated sensor_changed.');
        })
        .catch(error => {
          console.error('Cannot trigger flow card deviceSensorUpdated device: %s.', error);
        });

      this.homey.app.deviceSensorChanged.trigger(this, {
        sensor: this.homey.__(`capability.${capability}.name`),
        report: this.homey.__(`capability.${capability}.device_changed`, {
          value,
          plant: this.getName(),
        }),
        value: `${value}`,
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
    if (this.homey.app.thresholdMapping) {
      for (const capability in this.homey.app.thresholdMapping) {
        if (this.homey.app.thresholdMapping.hasOwnProperty(capability)) {
          const mapping = this.homey.app.thresholdMapping[capability];
          if (newSettings.hasOwnProperty(mapping.min) && newSettings.hasOwnProperty(mapping.max)) {
            const minValue = newSettings[mapping.min];
            const maxValue = newSettings[mapping.max];
            if (minValue >= maxValue) {
              return this.homey.__('settings.error.threshold', { capability: this.homey.__(`capability.${capability}.name`) });
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
    if (this.homey.app.thresholdMapping && this.homey.app.thresholdMapping.hasOwnProperty(capability)) {
      const minValue = this.getSetting(this.homey.app.thresholdMapping[capability].min);
      const maxValue = this.getSetting(this.homey.app.thresholdMapping[capability].max);

      if (value < minValue) {
        const report = this.homey.__(`capability.${capability}.threshold.min`, {
          value,
          min: minValue,
          plant: this.getName(),
        });

        this.homey.app.globalSensorOutsideThreshold.trigger({
          deviceName: this.getName(),
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
          });

        this.homey.app.deviceSensorOutsideThreshold.trigger(this, {
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
          });

        this.homey.app.globalSensorThresholdMinExceeds.trigger({
          deviceName: this.getName(),
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorThresholdMinExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorThresholdMinExceeds: %s.', error);
          });

        this.homey.app.deviceSensorThresholdMinExceeds.trigger(this, {
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
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
        const report = this.homey.__(`capability.${capability}.threshold.max`, {
          value,
          max: maxValue,
          plant: this.getName(),
        });

        this.homey.app.globalSensorOutsideThreshold.trigger({
          deviceName: this.getName(),
          report,
          sensor: this.homey.__(`capability.${capability}.name`),
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorOutsideThreshold: %s.', error);
          });

        this.homey.app.deviceSensorOutsideThreshold.trigger(this, {
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorOutsideThreshold.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorOutsideThreshold: %s.', error);
          });

        this.homey.app.globalSensorThresholdMaxExceeds.trigger({
          deviceName: this.getName(),
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card globalSensorThresholdMaxExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card globalSensorThresholdMaxExceeds: %s.', error);
          });

        this.homey.app.deviceSensorThresholdMaxExceeds.trigger(this, {
          sensor: this.homey.__(`capability.${capability}.name`),
          report,
          value: `${value}`,
          numeric: parseFloat(value),
        })
          .then(() => {
            // console.log('Successful triggered flow card deviceSensorThresholdMaxExceeds.');
          })
          .catch(error => {
            console.error('Cannot trigger flow card deviceSensorThresholdMaxExceeds: %s.', error);
          });
      }
    }
  }

  /**
   * Update the device on add
   */
  onAdded() {
    this.homey.app.registerDevice(this);
    this.homey.app.updateDevice(this);
  }

  /**
   * Unregister device
   */
  onDeleted() {
    this.homey.app.unregisterDevice(this);
  }

  /**
   * @param property
   *
   * @returns {Promise.<*>}
   */
  async getDeviceData(property) {
    const deviceData = await this.getData();
    if (Object.prototype.hasOwnProperty.call(deviceData, property)) {
      return deviceData[property];
    }

    return Promise.resolve();
  }

};
