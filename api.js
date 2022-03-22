'use strict';

module.exports = {
    async getDevices({ homey }) {
        // return homey.app.getDevicesTest()
        return homey.app.getApiDevices()
            .then(devices => {
                return devices;
            }).catch(error => {
                return error.message;
            });
    },
};
