'use strict';

const Homey = require('homey');

class HomeyMiFlora extends Homey.App {
    onInit() {
        console.log('Successfully init HomeyMiFlora');
    }
}

module.exports = HomeyMiFlora;