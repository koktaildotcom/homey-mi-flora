# Xiaomi mi flora sensor

## Introduction
This app integrate the `Xiaomi mi flora sensor` and `Xiaomi mi flora ropot` into Homey.

## Usage
1. Install app
2. Add device(s) to Homey.
3. Configure threshold in the device configuration.
4. Make a flow with one of the cards.

You can configure the timeout between polls in the app's settings.

## Cards
### Global cards
#### Trigger cards
1. Some device sensor is changed.
   * device
   * sensor
   * value

### Device cards
#### Trigger cards
1. Some device sensor is changed.
   * device
   * sensor
   * value
1. Sensor value is below the configured threshold.
2. Sensor value is above the configured threshold.

#### Condition cards
1. De plant !{{has not|has}} a correct temperature.
2. De plant !{{has not|has}} a enough sunlight.
3. De plant !{{has not|has}} a enough fertilizer.
4. De plant !{{has not|has}} a enough moisture.

## History
### v1.0.0 - 09.04.18
  * first alpha to app store.
### v1.0.1 - 10.04.18
  * add documentation
  * revert changes because it breaks the flow card.
  
## Final note ##
The repository is available at: https://github.com/koktaildotcom/homey-mi-flora

Do you like the app? You can buy me a beer! [![](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.me/koktaildotcom)