import { CombinedCapabilities, DeviceCapabilities, FirmwareCapabilities } from './Capabilities';
import { Threshold, ThresholdTranslation } from './ThresholdMapping';

export type CapabilityValuesMap = {
  [key in DeviceCapabilities]: number;
}

export type FirmwareValuesMap = {
  [key in FirmwareCapabilities]: number;
}

export type ThresholdTranslationMapping = {
  [key in CombinedCapabilities]: ThresholdTranslation;
}

export type ThresholdMap = {
  [key in CombinedCapabilities]: Threshold;
}
