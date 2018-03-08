'use strict';

const Homey = require('homey');

Homey.BlePeripheral.prototype.disconnect = function disconnect(callback) {
    if (typeof callback === 'function')
        return Homey.util.callbackAfterPromise(this, this.disconnect, arguments);

    const disconnectPromise = new Promise((resolve, reject) => {
        this._disconnectQueue.push((err, result) => err ? reject(err) : resolve(result));
});

    if (this._disconnectLockCounter === 0) {
        clearTimeout(this._disconnectTimeout);
        this._disconnectTimeout = setTimeout(() => {
            if (this._disconnectLockCounter === 0) {
            this._disconnected();
            // console.log('called disconnect', new Error().stack);
            this.__client.emit('disconnect', [this._connectionId, this.uuid], err => {
                this._connectionId = null;
            this._disconnectQueue.forEach(cb => cb(err));
            this._disconnectQueue.length = 0;
        });
        }
    }, 100);
    }

    return disconnectPromise;
};

Homey.BlePeripheral.prototype.getService = async function getService(uuid, callback) {
    if (typeof callback === 'function')
        return Homey.util.callbackAfterPromise(this, this.getService, arguments);

    this.resetConnectionWarning();

    let service = Array.isArray(this.services) ? this.services.find(service => service.uuid === uuid) : null;

    if (!service) {
        const [discoveredService] = await this.discoverServices([uuid]);

        if (!discoveredService && !Array.isArray(this.services)) {
            return Promise.reject(new Error('Error, could not get services'));
        }
        service = discoveredService;
    }

    return service || Promise.reject(new Error(`No service found with UUID ${uuid}`));
};


class HomeyMiFlora extends Homey.App {
    onInit() {
        console.log('Successfully init HomeyMiFlora');
    }
}

module.exports = HomeyMiFlora;