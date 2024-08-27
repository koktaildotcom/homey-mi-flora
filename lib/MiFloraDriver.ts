import Homey from 'homey';
import PairSession from 'homey/lib/PairSession';
import HomeyMiFloraApp from '../app';

export class MiFloraDriver extends Homey.Driver {

    /**
     * @abstract
     *
     * the name of the BLE for identification
     */
    getMiFloraBleIdentification(): string {
        throw new Error('todo: Implement getMiFloraBleIdentification into child class');
    }

    /**
     * @abstract
     *
     * the human readable name of the BLE
     */
    getMiFloraBleName(): string {
        throw new Error('todo: Implement getMiFloraBleName into child class');
    }

    /**
     * @abstract
     *
     * the supported capabilities
     */
    getSupportedCapabilities(): string[] {
        throw new Error('todo: Implement getSupportedCapabilities into child class');
    }

    /**
     * @abstract
     *
     * get the default settings
     */
    getDefaultSettings(): object {
        throw new Error('todo: Implement getDefaultSettings into child class');
    }

    /**
     * render a list of devices for pairing to homey
     */
    async onPair(session: PairSession) {
        session.setHandler('list_devices', async () => {
            return await this.getApp().discoverDevices(this);
        });
    }

    getApp(): HomeyMiFloraApp {
        return this.homey.app as HomeyMiFloraApp;
    }
}

module.exports = MiFloraDriver;
