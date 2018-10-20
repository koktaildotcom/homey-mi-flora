# Xiaomi mi flora sensor

## Introduction
This app integrate the `Xiaomi mi flora sensor` and `Xiaomi mi flora ropot` into Homey.

Do you like the app? You can make me happy by buying me a beer! [![](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.me/koktaildotcom)

## Usage
1. Install app
2. Add device(s) to Homey.
3. Configure threshold in the device configuration.
4. Make a flow with one of the cards.

You can configure the timeout between polls in the app's settings.

## Cards
### Device cards
#### Trigger cards
1. Some device sensor is changed.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture of Flora 1 is changed to: 20%.)
2. Some device sensor is updated.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture is updated to: 20%.)
3. Sensor value is below the configured threshold.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is to low. This can be at least 30%.)
4. Sensor value is above the configured threshold.
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is to high. This must be a maximum of 15%.)

#### Condition cards
1. De plant has a correct temperature.
2. De plant has enough sunlight.
3. De plant has enough nutrition.
4. De plant has enough moisture.

### Global cards
#### Trigger cards
1. Some device sensor is changed.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture is changed to: 20%.)
2. Some device sensor is updated.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture is updated to: 20%.)
3. Sensor value is below the configured threshold.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is to low. This can be at least 30%.)
4. Sensor value is above the configured threshold.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is to high. This must be a maximum of 15%.)
5. Sensor value is outside the configured threshold.
   * device (Flora 1)
   * sensor (Moisture)
   * value (20%)
   * report (The moisture (20%) is to high. This must be a maximum of 15%.)
6. Sensor gives a timeout after 3 tries.
   * device (Flora 1)
   * reason (Not in range)
7. The html report is changed
   * html_report (table with sensor data)
   
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
### v1.0.6 - 23.04.18
  * bump 1.0.5
### v1.0.7 - 27.04.18
  * change trigger min/max with correct translation
  * fixed validation error
  * remove unused try catch
  * add trigger: 'outside threshold'
  * add documentation
  * bubble up error and throw exception, but before that add new timeout
### v2.0.0 - 17.05.18
  * make drivers compatible with com.mi.flora
  * refactoring capabilities
  * add settings explanation for threshold
  * add min/max validation for threshold
### v2.0.1 - 18.05.18
  * change app id
### v2.0.2 - 18.05.18
  * mark device as broken due to missing capability battery
### v2.0.3 - 25.05.18
  * add support for ropot condition cards
### v2.0.4 - 25.05.18
  * add information on the pairing screen
### v2.0.5 - 25.05.18
  * removed test code
### v2.0.6 - 25.05.18
  * resolved merge conflicts
### v2.0.7 - 17.08.18
  * resolved issue: https://github.com/koktaildotcom/homey-mi-flora/issues/34 (Too many settings available for RoPot)
### v2.0.8 - 17.08.18
  * resolved issue: https://github.com/koktaildotcom/homey-mi-flora/issues/41 (App crash due to missing condition card arguments)
### v2.0.9 - 01.10.18
  * resolved issue: https://github.com/koktaildotcom/homey-mi-flora/issues/45 (Add a trigger card: Device is `out of range`)
  * add homeyCommunityTopicId for linking to new community forum
  * add html report for sending status report as email 
  * improve error handling and prevent `un-disconnected` devices
### v2.0.10 - 01.10.18
  * add missing dependencies
### v2.0.11 - 01.10.18
  * add missing dependencies
### v2.0.12 - 01.10.18
  * improve settings page
  * verbose forced disconnect from BLE after error
### v2.0.13 - 20.10.18
  * filter the existing devices out of the device list on pairing
  * add readable time format to HTML report
  
## Final note ##
The repository is available at: https://github.com/koktaildotcom/homey-mi-flora