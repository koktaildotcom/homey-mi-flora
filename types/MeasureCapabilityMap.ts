import { MeasureDeviceCapability } from './MeasureDeviceCapabilityEnum';
import { ThresholdMappingSetting, ThresholdMappingTranslation } from './ThresholdMapping';

export type MeasureCapabilityTranslationMap = {
  [key in MeasureDeviceCapability]: string;
}

export type MeasureCapabilityValuesMap = {
  [key in MeasureDeviceCapability]: number;
}

export type ThresholdMapping = {
  [key in MeasureDeviceCapability]: ThresholdMappingTranslation;
}

export type DefaultSettings = {
  [key in MeasureDeviceCapability]: ThresholdMappingSetting;
}
