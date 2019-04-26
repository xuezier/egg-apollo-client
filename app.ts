import { Application, IBoot } from 'egg';
import Apollo from './app/lib/apollo';
import * as path from 'path';
import * as fs from 'fs';

export default class FooBoot implements IBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
      const app = this.app;
      const config = app.config.apollo;
      if(!app.apollo) {
          app.apollo = new Apollo(app.config.apollo, app);
          app.apollo.init();
          app.config.NODE_ENV = app.apollo.get('NODE_ENV');

          const appConfig = this.app.config;
          const apolloConfigPath = path.resolve(appConfig.baseDir, 'config/config.apollo.js');

          try {
              fs.statSync(apolloConfigPath);
              const apolloConfig = require(apolloConfigPath)(app.apollo);

              Object.assign(app.config, apolloConfig);
          } catch(_) {
              app.logger.warn('[egg-apollo-client] loader config/config.apollo.js error');
          }

      }
  }
}