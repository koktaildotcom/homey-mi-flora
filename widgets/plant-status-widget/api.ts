import HomeyMiFloraApp from '../../app';
import MiFloraDevice from '../../lib/MiFloraDevice';

type devicesParams = {
  homey: {
    app: HomeyMiFloraApp
  },
}

export async function devices({ homey }: devicesParams): Promise<MiFloraDevice[]> {
  return homey.app.getDevices();
}
