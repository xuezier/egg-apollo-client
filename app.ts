import { Application, IBoot } from 'egg';
import Apollo from './app/lib/apollo';
import * as path from 'path';
import * as fs from 'fs';

export default class FooBoot implements IBoot {
    private app: Application & {apollo?: Apollo};

    constructor(app: Application & {apollo?: Apollo}) {
        this.app = app;
    }

    configWillLoad() {
        const app = this.app;
        if (!app.apollo) {
            app.apollo = new Apollo(app.config.apollo, app);
            app.apollo.init();

            const appConfig = this.app.config;
            const apolloConfigPath = path.resolve(appConfig.baseDir, 'config/config.apollo.js');

            try {
                fs.statSync(apolloConfigPath);
                const apolloConfig = require(apolloConfigPath)(app.apollo, JSON.parse(JSON.stringify(app.config)));

                Object.assign(app.config, apolloConfig);
            } catch (_) {
                app.logger.warn('[egg-apollo-client] loader config/config.apollo.js error');
            }

        }
    }
}
