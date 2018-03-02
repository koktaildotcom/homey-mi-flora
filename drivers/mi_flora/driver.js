'use strict';

const Homey = require('homey');

const FLOWER_CARE_NAME = 'Flower care';
const FLOWER_CARE_VERSION = 'v1.0.0';

class MiFloraDriver extends Homey.Driver {


    onPairListDevices(data, callback) {

        let devices = [];
        let index = 0;

        Homey.ManagerBLE.discover().then(function (advertisements) {
            console.log('discovering!');
            advertisements.forEach(function (advertisement) {
                if (advertisement.localName === FLOWER_CARE_NAME) {
                    ++index;
                    console.log('Find device ' + advertisement.uuid);
                    devices.push({
                        "name": FLOWER_CARE_NAME + " " + index,
                        "data": {
                            "id": advertisement.id,
                            "uuid": advertisement.uuid,
                            "name": advertisement.name,
                            "type": advertisement.type,
                            "version": FLOWER_CARE_VERSION,
                        },
                        "capabilities": [
                            "measure_temperature",
                            "measure_luminance",
                            "measure_humidity",
                            "measure_conductivity",
                            "measure_battery"
                        ],
                    });
                }
                else {
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