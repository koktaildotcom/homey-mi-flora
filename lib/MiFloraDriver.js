"use strict";

const Homey = require('homey');

module.exports = class MiFloraDriver extends Homey.Driver {

    /**
     * @abstract
     *
     * the name of the BLE for identification
     */
    getMiFloraBleIdentification() {
        throw new Error('todo: Implement getMiFloraBleIdentification into child class');
    }

    /**
     * @abstract
     *
     * the human readable name of the BLE
     */
    getMiFloraBleName() {
        throw new Error('todo: Implement getMiFloraBleName into child class');
    }

    /**
     * @abstract
     *
     * the supported capabilities
     */
    getSupportedCapabilities() {
        throw new Error('todo: Implement getSupportedCapabilities into child class');
    }

    /**
     * @abstract
     *
     * get the default settings
     */
    getDefaultSettings() {
        throw new Error('todo: Implement getDefaultSettings into child class');
    }

    /**
     * render a list of devices for pairing to homey
     */
    async onPair(session) {
        session.setHandler('list_devices', async () => {
            return await this.homey.app.discoverDevices(this);
        });
    }
}
