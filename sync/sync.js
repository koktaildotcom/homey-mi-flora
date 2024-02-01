'use strict';

const { signInWithEmailAndPassword } = require('@firebase/auth');

module.exports = class Sync {

    constructor(httpClient, firebaseAuth, username, password) {
        this.httpClient = httpClient;
        this.firebaseAuth = firebaseAuth;
        this.username = username;
        this.password = password;
    }

    async getToken() {
        try {
            if (!this.token) {
                const userCredential = await signInWithEmailAndPassword(
                    this.firebaseAuth,
                    this.username,
                    this.password,
                );
                this.token = userCredential.user.getIdToken();
            }
        } catch (e) {
            console.log(e);
        }
        return this.token;
    }

    async getDevices() {
        console.log('GET /api/devices');
        return this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: '/api/devices',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
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
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .then(result => {
                return result.data;
            });
    }

    async addDeviceMetrics(deviceKey, metric) {
        console.log(`POST /api/devices/${deviceKey}/metrics`);
        await this.httpClient.request(
            {
                method: 'POST',
                timeout: 10000,
                url: `/api/devices/${deviceKey}/metrics`,
                data: JSON.stringify(metric),
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .catch(e => {
                console.error(e);
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
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .then(response => response.data)
            .catch(e => {
                console.error(e);
            });
    }

    async updateDeviceEntity(deviceId, name, capabilitySensors) {
        console.log(`GET /api/devices/${deviceId}`);
        const currentDevice = await this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: `/api/devices/${deviceId}`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .then(response => response.data)
            .catch(e => {
                console.error(e);
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
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .catch(e => {
                console.error(e);
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
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .then(response => response.data)
            .catch(e => {
                console.error(e);
            });
    }

    async updatePlantEntity(plantKey, capabilityRanges, plantName) {
        console.log(`GET /api/plants/${plantKey}`);
        const plant = await this.httpClient.request(
            {
                method: 'GET',
                timeout: 10000,
                url: `/api/plants/${plantKey}`,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .then(response => response.data)
            .catch(e => {
                console.error(e);
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
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${await this.getToken()}`,
                },
            },
        )
            .catch(e => {
                console.error(e);
            });
    }

};
