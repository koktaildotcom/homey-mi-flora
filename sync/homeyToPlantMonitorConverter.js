'use strict';

const unitMapping = {
    measure_temperature: '°C',
    measure_luminance: 'lux',
    measure_nutrition: 'µS/cm',
    measure_moisture: '%',
    measure_battery: '%',
};

module.exports = class HomeyToPlantMonitorConverter {

    // @todo split creating entities and push them
    constructor(sync, homeyAPI, thresholdMapping) {
        this.sync = sync;
        this.homeyAPI = homeyAPI;
        this.thresholdMapping = thresholdMapping;
    }

    async syncPlantMonitor(devices) {
        try {
            const sensors = await this.sync.getDevices();
            const plants = await this.sync.getPlants();

            for (const device of devices) {
                const deviceId = await device.getDeviceData('id');
                const homeyDeviceId = await this.findHomeyDeviceId(device);
                if (!homeyDeviceId) {
                    return;
                }

                // find history
                // const homeyDevice = await this.homeyAPI.devices.getDevice({ id: homeyDeviceId });
                // console.log(homeyDevice);
                // const result = await this.homeyAPI.insights.getLogs({
                //     id: homeyDevice.insights[0].id,
                //     uri: homeyDevice.insights[0].uri,
                // });
                // console.log(result);

                const capabilitySensors = [];
                const capabilityRanges = [];
                for (const capability of device.getCapabilities()) {
                    const thresholdMapping = this.thresholdMapping[capability];

                    capabilitySensors.push({
                        type: capability.replace('measure_', ''),
                        name: deviceId,
                        unit: unitMapping[capability],
                        history: [],
                    });

                    let min = 0;
                    let max = 100;
                    if (thresholdMapping) {
                        min = await device.getSetting(thresholdMapping.min);
                        max = await device.getSetting(thresholdMapping.max);
                    }
                    capabilityRanges.push({
                        type: capability.replace('measure_', ''),
                        min,
                        max,
                        unit: unitMapping[capability],
                    });
                }

                const plantKey = `${deviceId}_plant`;
                const deviceKey = `${deviceId}_device`;

                // update device
                if (!sensors.find(target => target.id === deviceKey)) {
                    console.log(`add sensor ${deviceKey}`);
                    await this.sync.addDeviceEntity(plantKey, JSON.stringify({
                        id: deviceKey,
                        bleAddress: device.getData()
                            .uuid
                            .split(/(.{2})/)
                            .filter(O => O)
                            .map(string => string.toUpperCase())
                            .join(':'),
                        uuid: device.getData(),
                        name: `sensor ${device.getName()} `,
                        lastUpdatedAt: new Date().toISOString(),
                        plant: plantKey,
                        capabilitySensors,
                    }));
                } else {
                    // console.log(`update sensor ${deviceKey}`);
                    // await this.sync.updateDeviceEntity(
                    //     deviceKey,
                    //     device.getName(),
                    //     capabilitySensors,
                    // );
                }

                // update plant
                if (!plants.find(target => target.id === plantKey)) {
                    console.log(`add plant ${plantKey}`);
                    await this.sync.addPlantEntity(deviceKey, JSON.stringify({
                        id: plantKey,
                        name: device.getName(),
                        size: 'm',
                        capabilityRanges,
                    }));
                } else {
                    // console.log(`update plant ${plantKey}`);
                    // await this.sync.updatePlantEntity(
                    //     plantKey,
                    //     capabilityRanges,
                    //     device.getName(),
                    // );
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    async findHomeyDeviceId(device) {
        const deviceId = await device.getDeviceData('id');
        if (!deviceId) {
            return null;
        }
        const sym = Object.getOwnPropertySymbols(device.driver)
            .find(symbol => {
                return String(symbol) === 'Symbol(devicesById)';
            });
        const mapping = device.driver[sym];
        for (const homeyId in mapping) {
            if (mapping[homeyId].id === deviceId) {
                return homeyId;
            }
        }

        return null;
    }
};
