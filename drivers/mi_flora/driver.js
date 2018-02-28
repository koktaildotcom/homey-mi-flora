'use strict';

const Homey = require('homey');

const FLOWER_CARE_NAME = 'Flower care';

class MiFloraDriver extends Homey.Driver {
    onPairListDevices(data, callback) {

        console.log('Successfully init onPairListDevices');

        //measure_temperature

        let devices = [];
        let index = 0;

        let ManagerBLE = Homey.ManagerBLE;
        ManagerBLE.discover().then(function (advertisements) {
            console.log('discovering!');
            advertisements.forEach(function (advertisement) {
                if (advertisement.localName === FLOWER_CARE_NAME) {
                    ++index;
                    devices.push({
                        "name": FLOWER_CARE_NAME +" "+  index,
                        "data": {
                            "id": advertisement.uuid,
                            "name": advertisement.name,
                            "type": advertisement.type
                        },
                        "capabilities": [
                            "measure_temperature",
                            "measure_luminance",
                            "measure_humidity",
                            "measure_conductivity"
                        ],
                        //
                        //
                        // Optional properties, these overwrite those specified in app.json:
                        // "icon": "/path/to/another/icon.svg",
                        // "capabilities": [ "onoff", "dim" ],
                        // "capabilitiesOptions: { "onoff": {} },
                        // "mobile": {},

                        // Optional properties, device-specific:
                        // "store": { "foo": "bar" },
                        // "settings": {},
                    });
                }
                else{
                    console.log('Skipped device ' + advertisement.uuid);
                }
            });

            callback(null, devices);
        })
            .catch(function (error) {
                console.error('Cannot discover BLE devices from the homey manager.', error);
            });
    }
}

module.exports = MiFloraDriver;