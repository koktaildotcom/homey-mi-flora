import HomeyMiFloraApp from '../../app';
import MiFloraDevice from '../../lib/MiFloraDevice';

type DevicesParams = {
  homey: {
    app: HomeyMiFloraApp
  },
}

export async function devices({ homey }: DevicesParams): Promise<MiFloraDevice[]> {
  return homey.app.getDevices();
}


type DeviceLastUpdate = {
  homey: {
    app: HomeyMiFloraApp
  },
  query: {
    date: string
  }
}

export async function deviceLastUpdate({ homey, query }: DeviceLastUpdate): Promise<string> {
  return homey.app.getDeviceLastUpdate(query.date);
}
