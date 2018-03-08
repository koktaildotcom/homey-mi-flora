'use strict';

const Homey = require('homey');

class MiFloraDevice extends Homey.Device {

    onInit() {

        this.log('Device (' + this.getName() + ') initialized');

        let sensorChanged = new Homey.FlowCardTrigger('sensor_changed');

        sensorChanged.register();

        // When capability is changed
        this.registerMultipleCapabilityListener(this.getCapabilities(), (valueObj, optsObj) => {

            console.log(valueObj, optsObj);

            // this.log(this.getName() + ' -> Capability changed: ' + JSON.stringify(valueObj));
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
        //     this._driver.updateSensorData(data.uuid, this).then(function (data) {
        //         console.log("Initialized user details");
        //         // Use user details from here
        //         console.log(data)
        //     }, function (error) {
        //         console.log('connect failed: %s', error);
        //     })
        // });
    }

    onInitWorks() {

        var settings = this.getSettings();
        var data = this.getData();

        this._driver = this.getDriver();
        this._driver.ready(() => {

            Homey.ManagerBLE.discover().then(function (advertisements) {

                advertisements.forEach(function (advertisement) {
                    console.log(advertisement.uuid);
                    if (advertisement.uuid === data.uuid) {

                        console.log('connected ' + advertisement.uuid);

                        advertisement.connect((error, peripheral) => {
                            if (error) {
                                console.log('connect failed: %s', error);
                            }

                            peripheral.discoverServices((error, services) => {
                                if (error) {
                                    console.log('discoverServices failed: %s', error);
                                }
                                console.log('got services!');
                                services.forEach(function (service) {
                                    service.discoverCharacteristics((error, characteristics) => {
                                        if (error) {
                                            console.log('discoverCharacteristics failed: %s', error);
                                        }
                                        characteristics.forEach(function (characteristic) {
                                            console.log('got characteristic ' + characteristic.uuid);

                                            switch (characteristic.uuid) {

                                                case DATA_CHARACTERISTIC_UUID:
                                                    characteristic.read(function (error, data) {
                                                        if (error) {
                                                            console.log('read failed: %s', error);
                                                        }

                                                        console.log('read characteristic ' + characteristic.uuid);

                                                        console.log(data);

                                                        let temperature = data.readUInt16LE(0) / 10;
                                                        let lux = data.readUInt32LE(3);
                                                        let moisture = data.readUInt16BE(6);
                                                        let fertility = data.readUInt16LE(8);

                                                        console.log('temperature: %s °C', temperature);
                                                        console.log('Light: %s lux', lux);
                                                        console.log('moisture: %s %', moisture);
                                                        console.log('fertility: %s µS/cm', fertility);

                                                    });
                                                    break;
                                                case FIRMWARE_CHARACTERISTIC_UUID:

                                                    console.log('read characteristic ' + characteristic.uuid);
                                                    characteristic.read(function (error, data) {

                                                        if (error) {
                                                            console.log('read failed: %s', error);
                                                        }

                                                        console.log(data);

                                                        let batteryLevel = parseInt(data.toString('hex', 0, 1), 16);
                                                        let firmwareVersion = data.toString('ascii', 2, data.length);

                                                        console.log('batteryLevel: %s %', batteryLevel);
                                                        console.log('firmwareVersion: %s ', firmwareVersion);

                                                    });

                                                    break;
                                                case REALTIME_CHARACTERISTIC_UUID:
                                                    console.log('enabling realtime');
                                                    characteristic.write(Buffer.from([0xA0, 0x1F]), false);
                                                    break;
                                                default:
                                                //console.log('found characteristic uuid %s but not matched the criteria', characteristic.uuid);
                                            }
                                        })
                                    });
                                });
                            });
                        });
                    }
                });
            })
                .catch(function (error) {
                    console.error('Cannot discover BLE devices from the homey manager.', error);
                });

        });
    }

    // parseData(peripheral, data) {
    //     debug('data:', data);
    //     let temperature = data.readUInt16LE(0) / 10;
    //     let lux = data.readUInt32LE(3);
    //     let moisture = data.readUInt16BE(6);
    //     let fertility = data.readUInt16LE(8);
    //     let deviceData = new DeviceData(peripheral.id,
    //         temperature,
    //         lux,
    //         moisture,
    //         fertility);
    //
    //     debug('temperature: %s °C', temperature);
    //     debug('Light: %s lux', lux);
    //     debug('moisture: %s %', moisture);
    //     debug('fertility: %s µS/cm', fertility);
    //
    //     this.emit('data', deviceData);
    // }
    //
    // parseFirmwareData(peripheral, data) {
    //     debug('firmware data:', data);
    //     let firmware = {
    //         deviceId: peripheral.id,
    //         batteryLevel: parseInt(data.toString('hex', 0, 1), 16),
    //         firmwareVersion: data.toString('ascii', 2, data.length)
    //     };
    //     this.emit('firmware', firmware);
    // }


    onDelete() {
        clearInterval(this.updateDataInterval);
    }
}

module.exports = MiFloraDevice;