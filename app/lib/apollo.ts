import * as assert from 'assert';
import { Application } from 'egg';
import request from './request';

export interface IApolloConfig {
    config_server_url: string;
    app_id: string;
    cluster_name?: string;
    namespace_name?: string;
    release_key?: string;
    ip?: string;
}

export class ApolloConfigError extends Error {
    constructor(message?: string) {
        super(message);
        this.message = `ApolloConfigError: ${message}`;
    }
}

export default class Apollo {
    app: Application;

    private _config_server_url = '';
    private _app_id = '';
    private _cluster_name = 'default';
    private _namespace_name = 'application';
    private _release_key = '';
    private _ip = '';

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

        return response.data;
    }

    async remoteConfigServiceSkipCache() {
        const url = `${this.config_server_url}/configs/${this.app_id}/${this.cluster_name}/${this.namespace_name}`;
        const data = {
            releaseKey: this.release_key,
            ip: this.ip,
        };

        const response = await request(url, { data });
        this.setConfig('release_key', response.data.releaseKey);
        return response.data;
    }

    async writeEnvFile() {

    }

    setEnv() {

    }
}
