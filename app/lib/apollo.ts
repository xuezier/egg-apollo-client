import * as fs from 'fs';

import { Application } from 'egg';

import { Apollo as NativeApollo } from '@gaoding/apollo-client';

import { IApolloConfig } from '@gaoding/apollo-client/dist/interface/IApolloConfig';

export interface ApolloReponseConfigData {
    // '{"appId":"ums-local","cluster":"default","namespaceName":"application","configurations":{"NODE_ENV":"production"}
    appId: string;
    cluster: string;
    namespaceName: string;
    configurations: {
        [x: string]: string;
    };
    releaseKey: string;
}

export default class Apollo extends NativeApollo {
    app: Application;

    constructor(config: IApolloConfig, app: Application) {
        super(config, app.logger);
        this.app = app;
    }

    get config_server_url() {
        return super.config_server_url;
    }

    get app_id() {
        return super.app_id;
    }

    get secret() {
        return super.secret;
    }

    get token() {
        return super.token;
    }

    get portal_address() {
        return super.portal_address;
    }

    get cluster_name() {
        return super.cluster_name;
    }

    get namespace_name() {
        return super.namespace_name;
    }

    get release_key() {
        return super.release_key;
    }

    get ip() {
        return super.ip;
    }

    get watch() {
        return super.watch;
    }

    get env_file_path() {
        return super.env_file_path;
    }

    get env_file_type() {
        return super.env_file_type;
    }

    get set_env_file() {
        return super.set_env_file;
    }

    get init_on_start() {
        return super.init_on_start;
    }

    get configs() {
        return super.configs;
    }

    get apollo_env() {
        return super.apollo_env;
    }

    get notifications() {
        return super.notifications;
    }

    get delay() {
        return super.delay;
    }

    get timeout() {
        return super.timeout;
    }

    get envReader() {
        return super.envReader;
    }

    get openApi() {
        return super.openApi;
    }

    get(key: string) {
        const configs = this.configs;

        return configs.get(key);
    }

    getString(key: string) {
        return this.configs.getString(key);
    }

    getNumber(key: string) {
        return this.configs.getNumber(key);
    }

    getBoolean(key: string) {
        return this.configs.getBoolean(key);
    }

    getJSON(key: string) {
        return this.configs.getJSON(key);
    }

    getDate(key: string) {
        return this.configs.getDate(key);
    }

    protected saveEnvFile(data: ApolloReponseConfigData) {
        if (!(this.app.type === 'agent'))
            return;

        const { configurations, namespaceName, releaseKey } = data;

        this.apollo_env.release_key = releaseKey;
        for (const key in configurations) {
            this.apollo_env[`${namespaceName}.${key}`] = configurations[key];
        }

        let fileData = '';
        for (const key in this.apollo_env) {
            fileData += `${key}=${this.apollo_env[key]}\n`;
        }

        const envPath = this.env_file_path;
        if (fs.existsSync(envPath)) {
            // 只有 agent-worker 才能写入 env 文件
            // 避免多个 app-worker 写入的时候文件已被移除，造成错误
            const rename = `${envPath}.${Date.now()}`;
            try {
                fs.renameSync(envPath, rename);
            }
            catch (e) {
                process.env.NODE_ENV !== 'production' && console.error(e);
            }
        }
        fs.writeFileSync(envPath, fileData, 'utf-8');
    }
}
