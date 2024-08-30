export interface DeviceInfo {
  id: string
  name: string
  capabilities?: string[],
  data: {
    id: string,
    uuid: string,
    address: string,
    version: string,
  },
  settings: {
    uuid: string,
    measure_temperature_min?: 16,
    measure_temperature_max?: 25,
    measure_nutrition_min?: 300,
    measure_nutrition_max?: 1000,
    measure_moisture_min?: 15,
    measure_moisture_max?: 30,
    measure_luminance_min?: 1000,
    measure_luminance_max?: 2000,
  }
}
