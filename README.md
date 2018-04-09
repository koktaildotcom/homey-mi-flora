# Xiaomi mi flora sensor #

Integrate Xiaomi mi flora sensor into Homey.

## How to quick start ##
1. Install app
2. Add device(s) to Homey.
3. Configure threshold in the device configuration.
4. Make a flow with one of the cards.

You can configure the timeout between polls in the app's settings.

## There are some cards globally ##
Trigger cards
1. Some device sensor is changed.
   * device
   * sensor
   * value

## There are some cards device specific ##
Trigger cards
1. Some device sensor is changed.
   * device
   * sensor
   * value
1. Sensor value is below the configured threshold.
2. Sensor value is above the configured threshold.

Condition cards
1. De plant !{{has not|has}} a correct temperature.
2. De plant !{{has not|has}} a enough sunlight.
3. De plant !{{has not|has}} a enough fertilizer.
4. De plant !{{has not|has}} a enough moisture.