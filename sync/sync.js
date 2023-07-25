'use strict';

module.exports = class Sync {

    constructor(httpClient) {
        this.httpClient = httpClient;
    }

    async getDevices() {
        console.log('GET /api/devices');
        return this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: '/api/devices',
            },
        )
            .then(result => {
                return result.data;
            });
    }

    async getPlants() {
        console.log('GET /api/plants');
        return this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: '/api/plants',
            },
        )
            .then(result => {
                return result.data;
            });
    }

    async addDeviceMetrics(deviceKey, metric) {
        console.log(`PUT /api/devices/${deviceKey}/metrics`);
        await this.httpClient.request(
            {
                method: 'PUT',
                timeout: 10000,
                url: `/api/devices/${deviceKey}/metrics`,
                data: JSON.stringify(metric),
            },
        )
            .catch(e => {
                throw new Error(e);
            });
    }

    async addDeviceEntity(deviceKey, data) {
        console.log('POST /api/devices');
        await this.httpClient.request(
            {
                method: 'POST',
                timeout: 10000,
                url: '/api/devices',
                data,
            },
        )
            .then(response => response.data)
            .catch(e => {
                throw new Error(e);
            });
    }

    async updateDeviceEntity(deviceId, name, capabilitySensors) {
        console.log(`GET /api/devices/${deviceId}`);
        const currentDevice = await this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: `/api/devices/${deviceId}`,
            },
        )
            .then(response => response.data)
            .catch(e => {
                throw new Error(e);
            });

        currentDevice.name = `sensor ${name} `;
        currentDevice.lastUpdatedAt = new Date().toISOString();
        currentDevice.capabilitySensors = capabilitySensors;

        console.log(`PUT /api/devices/${deviceId}`);
        await this.httpClient.request(
            {
                method: 'PUT',
                timeout: 10000,
                url: `/api/devices/${deviceId}`,
                data: JSON.stringify(currentDevice),
            },
        )
            .catch(e => {
                throw new Error(e);
            });
    }

    async addPlantEntity(plantKey, data) {
        console.log('POST /api/plants');
        await this.httpClient.request(
            {
                method: 'POST',
                timeout: 10000,
                url: '/api/plants',
                data,
            },
        )
            .then(response => response.data)
            .catch(e => {
                throw new Error(e);
            });
    }

    async updatePlantEntity(plantKey, capabilityRanges, plantName) {
        console.log(`GET /api/plants/${plantKey}`);
        const plant = await this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: `/api/plants/${plantKey}`,
            },
        )
            .then(response => response.data)
            .catch(e => {
                throw new Error(e);
            });

        plant.capabilityRanges = capabilityRanges;
        plant.name = plantName;

        console.log(`PUT /api/plants/${plantKey}`);
        await this.httpClient.request(
            {
                method: 'PUT',
                timeout: 10000,
                url: `/api/plants/${plantKey}`,
                data: JSON.stringify(plant),
            },
        )
            .catch(e => {
                throw new Error(e);
            });
    }
};
