'use strict';

const Homey = require('homey');
const noble = require('noble');

class HomeyMiFlora extends Homey.App {

    onInit() {
        peripheral.discoverAllServicesAndCharacteristics([callback(error, services, characteristics)]);
    }
}

module.exports = HomeyMiFlora;