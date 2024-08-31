export enum DeviceCapabilities {
  Temperature = 'measure_temperature',
  Luminance = 'measure_luminance',
  Nutrition = 'measure_nutrition',
  Moisture = 'measure_moisture',
}

export enum FirmwareCapabilities {
  Battery = 'measure_battery',
}

export enum CombinedCapabilities {
  Temperature = DeviceCapabilities.Temperature,
  Luminance = DeviceCapabilities.Luminance,
  Nutrition = DeviceCapabilities.Nutrition,
  Moisture = DeviceCapabilities.Moisture,
  Battery = FirmwareCapabilities.Battery,
}
