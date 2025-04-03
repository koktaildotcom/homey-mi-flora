# Xiaomi mi flora sensor

![app image](assets/images/large.png)

## Introduction
This app integrates the `Xiaomi mi flora sensor` and `Xiaomi mi flora ropot` into Homey.

Do you like the app? You can make me happy by buying me a beer! [![](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.me/koktaildotcom)

## Q&amp;A

> **Q1**  Why can’t the sensor be found by Homey?

* _Check if the sensor is connected to another bluetooth device. The  `Xiaomi Mi Flora`  app for example_

> **Q1**  Why are the readings from the sensors different from in the  `Xiaomi Mi Flora`  app?

* _It is caused by old firmware (2.7.0), try to update the sensors through the  `Xiaomi Mi Flora`  app_

> **Q3**  Is the app compatibel with v2.0.0?

* The app is only compatible from v2.1.2 and up due to change to the BLE core.

> **Q4**  Is the app compatibel with SDK 3?

* Yes the app is compatible from v3.0.0

## Usage
1. Install app
2. Add the device(s) to Homey.
3. Configure the threshold in the device configuration.
4. Make a flow with one of the cards.

You can configure the timeout between polls in the app's settings.

## Cards
### Device cards
#### Trigger cards
1. Some device sensor has changed.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture of Flora 1 has changed to: 20%.)
2. Some device sensor is updated.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture is updated to: 20%.)
3. Sensor value is below the configured threshold.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is too low. This can be at least 30%.)
4. Sensor value is above the configured threshold.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is too high. This must be a maximum of 15%.)

#### Condition cards
1. De plant has a correct temperature.
2. De plant has enough sunlight.
3. De plant has enough nutrition.
4. De plant has enough moisture.

### Global cards
#### Trigger cards
1. Some device sensor has changed.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture has changed to: 20%.)
2. Some device sensor is updated.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture is updated to: 20%.)
3. Sensor value is below the configured threshold.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is too low. This can be at least 30%.)
4. Sensor value is above the configured threshold.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is too high. This must be a maximum of 15%.)
5. Sensor value is outside the configured threshold.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is too high. This must be a maximum of 15%.)
6. Sensor gives a timeout after 3 tries.
   * device (Flora 1)
   * reason (Not in range)
   
#### Condition cards
1. De plant has a correct temperature.
2. De plant has enough sunlight.
3. De plant has enough nutrition.
4. De plant has enough moisture.

#### Action cards
1. Synchronise all sensor values with Homey.

## Final note ##
The repository is available at: https://github.com/koktaildotcom/homey-mi-flora
