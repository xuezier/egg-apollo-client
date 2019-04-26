import * as assert from 'assert';
import { Application } from 'egg';
import request from './request';

import curl, { CurlMethods } from '../../lib/curl';

export interface IApolloConfig {
    config_server_url: string;
    app_id: string;
    cluster_name?: string;
    namespace_name?: string;
    release_key?: string;
    ip?: string;
    watch?: boolean;
}

export class ApolloConfigError extends Error {
    constructor(message?: string) {
        super(message);
        this.message = `ApolloConfigError: ${message}`;
    }
}

export class ApolloInitConfigError extends Error {
    constructor(message?: string) {
        super(message);
        this.message = `ApolloInitConfigError: ${message}`;
    }
}

export interface AppolloReponseConfigData {
    // '{"appId":"ums-local","cluster":"default","namespaceName":"application","configurations":{"NODE_ENV":"production"}
    appId: string;
    cluster: string;
    namespaceName: string;
    configurations: {
        [x: string]: string;
    };
    releaseKey: string;
}

export default class Apollo {
    app: Application;

    private _config_server_url = '';
    private _app_id = '';
    private _cluster_name = 'default';
    private _namespace_name = 'application';
    private _release_key = '';
    private _ip = '';
    private _watch = false;
    _configs: {[x: string]: Map<string, string>} = {};


    constructor(config: IApolloConfig, app: Application) {
        this.app = app;

        assert(config.config_server_url, 'config option config_server_url is required');
        assert(config.app_id, 'config option app_id is required');

        for (const key in config) {
            this.setConfig(key, config[key]);
        }
    }

    get config_server_url() {
        return this._config_server_url;
    }

    get app_id() {
        return this._app_id;
    }

    get cluster_name() {
        return this._cluster_name;
    }

    get namespace_name() {
        return this._namespace_name;
    }

    get release_key() {
        return this._release_key;
    }

    get ip() {
        return this._ip;
    }

    get watch() {
        return this._watch;
    }

    get configs() {
        return this._configs;
    }

    init() {
        const url = `${this.config_server_url}/configs/${this.app_id}/${this.cluster_name}/${this.namespace_name}`;
        const data = {
            releaseKey: this.release_key,
            ip: this.ip,
        };

        const response = curl({
            url,
            method: CurlMethods.GET,
            body: JSON.stringify(data),
            headers: ['Content-Type: application/json']
        });

        const {body, status, message} = response;
        if(status === 200) {
            const data = JSON.parse(body);
            this.setEnv(data);
        } else {
            throw new ApolloInitConfigError(message);
        }
    }

    /**
     * @description 复写配置项信息
     * @author tunan
     * @param {string} key
     * @param {string} value
     * @memberof Apollo
     */
    setConfig(key: string, value: string) {
        if (!(key in this)) {
            throw new ApolloConfigError(`${key} not a apollo config`);
        }

        this['_' + key] = value;
    }

    async remoteConfigServiceFromCache() {
        const url = `${this.config_server_url}/configfiles/json/${this.app_id}/${this.cluster_name}/${this.namespace_name}`;
        const data = {
            releaseKey: this.release_key,
            ip: this.ip,
        };

        const response = await request(url, { data });
        console.log(response.data);
        return response.data;
    }

    async remoteConfigServiceSkipCache() {
        const url = `${this.config_server_url}/configs/${this.app_id}/${this.cluster_name}/${this.namespace_name}`;
        const data = {
            releaseKey: this.release_key,
            ip: this.ip,
        };
        if(data) {}
        const response = await request(url, { data });
        if(response.data) {
            this.setEnv(response.data);
        }
        return response.data;
    }

    async writeEnvFile() {

    }

    get(key: string) {
        const configs = this.configs;
        const config = configs['default'];
        if(config) {
            if(config.get(key)) {
                return config.get(key);
            }
        }

        return process.env[key];
    }

    cluster(name: string) {
        return this.configs[name];
    }

    private setEnv(data: AppolloReponseConfigData) {
        const {cluster, configurations, releaseKey} = data;

        this.setConfig('release_key', releaseKey);
        const config = this._configs[cluster] = new Map();
        for(const key in configurations) {
            config.set(key, configurations[key]);
        }
    }
}
