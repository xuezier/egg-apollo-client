import { Application, IBoot } from 'egg';
import Apollo, { IApolloConfig } from './app/lib/apollo';
import * as path from 'path';
import * as fs from 'fs';
declare function require(name:string);
export default class FooBoot implements IBoot {
    private app: Application & {apollo?: Apollo};

    constructor(app: Application & {apollo?: Apollo}) {
        this.app = app;
    }

    configWillLoad() {
        const app = this.app;

        const config: IApolloConfig = app.config.apollo;
        if(config.init_on_start === false) {
            return;
        }

        if (!app.apollo) {
            app.apollo = new Apollo(app.config.apollo, app);
            app.apollo.init();

            const appConfig = this.app.config;
            const apolloConfigPath = path.resolve(appConfig.baseDir, `config/config.apollo.${process.env.NODE_ENV === 'production' ? 'js': 'ts'}`);

            try {
                fs.statSync(apolloConfigPath);
                const apolloConfigFunc: Function = require(apolloConfigPath).default || require(apolloConfigPath);
                const apolloConfig = apolloConfigFunc(app.apollo, JSON.parse(JSON.stringify(app.config)));

                Object.assign(app.config, apolloConfig);
                return
            } catch (_) {
                app.logger.warn('[egg-apollo-client] loader config/config.apollo.js error');
            }

        }
    }

    async willReady() {
        const config: IApolloConfig = this.app.config.apollo;
        if(config.watch) {
            this.app.apollo.startNotification();
        }
    }
}
