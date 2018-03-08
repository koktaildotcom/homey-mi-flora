'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    onInit() {

        console.log('Device (' + this.getName() + ') initialized');

        let sensorChanged = new Homey.FlowCardTrigger('sensor_changed');
        sensorChanged.register();

        // When capability is changed
        this.registerMultipleCapabilityListener(this.getCapabilities(), (valueObj, optsObj) => {

            this.log(this.getName() + ' -> Capability changed: ' + JSON.stringify(valueObj));
            //
            // process.nextTick(async () => {
            //     await sleep(100);
            //     triggerDevice.trigger(this, {}, valueObj)
            //         .catch(this.error);
            // });
            //
            // // b.v.: valueObj = {"light_saturation":1}
            // let variable = Object.keys(valueObj)[0];
            // // this.log('variable: ' + variable);
            // // this.log('value:    ' + valueObj[variable]);
            //
            // let tokens = {
            //     'device': this.getName(),
            //     'variable': variable,
            //     'value': '' + valueObj[variable]
            // }
            //
            // sensorChanged.trigger(tokens)
            //     .catch(this.error)

            return Promise.resolve();
        }, 500);


        // var settings = this.getSettings();
        // var data = this.getData();
        //
        // this._driver = this.getDriver();


        // this._driver = this.getDriver();
        // this._driver.ready(() => {
        //     this._driver._updateSensorData(data.uuid, this).then(function (data) {
        //         console.log("Initialized user details");
        //         // Use user details from here
        //         console.log(data)
        //     }, function (error) {
        //         console.log('connect failed: %s', error);
        //     })
        // });
    }

    onDelete() {
        clearInterval(this.updateDataInterval);
    }
}

module.exports = MiFloraDevice;