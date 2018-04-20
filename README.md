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
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture of `Flora 1` is changed to: 20%.)

### Device cards
#### Trigger cards
1. Some device sensor is changed.
   * device (Flora 1)`
   * sensor (Moisture)`
   * value (20%)
   * report (The moisture is changed to: 20%.)
1. Sensor value is below the configured threshold.
   * device (Flora 1)`
   * sensor (Moisture)`
   * value (20%)
   * report (The moisture (20%) is to low. This can be at least 30%.)
2. Sensor value is above the configured threshold.
   * device (Flora 1)`
   * sensor (Moisture)`
   * value (20%)
   * report (The moisture (20%) is to high. This must be a maximum of 15%.)

#### Condition cards
1. De plant has a correct temperature.
2. De plant has enough sunlight.
3. De plant has enough nutrition.
4. De plant has enough moisture.

## History
### v1.0.0 - 09.04.18
  * first alpha to app store.
### v1.0.1 - 10.04.18
  * add documentation
  * revert changes because it breaks the flow card.
### v1.0.2 - 17.04.18
  * moved capabilities to drivers because of RoPot missing one.
  * update capability name from fertilizer to nutritions.
  * change tags for `capability` in card to user preferred language.
  * add tags: `report` with a human readable report of the status.
### v1.0.3 - 17.04.18
  * add missing battery report translation
### v1.0.4 - 18.04.18
  * add missing icon
  * add documentation to readme
### v1.0.5 - 20.04.18
  * bump 1.0.4
  
## Final note ##
The repository is available at: https://github.com/koktaildotcom/homey-mi-flora

Do you like the app? You can buy me a beer! [![](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.me/koktaildotcom)