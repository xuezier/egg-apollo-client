import { EggAppConfig, PowerPartial } from 'egg';

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.apollo = {
    client: {

    }
  };

  return config;
};