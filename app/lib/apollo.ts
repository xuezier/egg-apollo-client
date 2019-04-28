import * as path from 'path';
import * as fs from 'fs';
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
    set_env_file?: boolean;
    env_file_path?: string;
}

export interface IApolloRequestConfig {
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
    private _set_env_file = false;
    private _env_file_path = '';

    private _apollo_env: { [x: string]: string } = {};
    private _configs: {[x: string]: Map<string, string>} = {};

    constructor(config: IApolloConfig, app: Application) {
        this.app = app;

        assert(config.config_server_url, 'config option config_server_url is required');
        assert(config.app_id, 'config option app_id is required');

        config.env_file_path = this.checkEnvPath(config.env_file_path);

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

    get env_file_path() {
        return this._env_file_path;
    }

    get set_env_file() {
        return this._set_env_file;
    }

    get configs() {
        return this._configs;
    }

    get apollo_env() {
        return this._apollo_env;
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
            headers: [ 'Content-Type: application/json' ],
        });

        const { body, status, message } = response;
        if (status === 200) {
            const data = JSON.parse(body);
            this.setEnv(data);
        } else {
            const error = new ApolloInitConfigError(message);
            this.app.logger.warn('[egg-apollo-client] %j', error);

            if (this.set_env_file) {
                this.readFromEnvFile();
            }
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

    async remoteConfigServiceFromCache(config: IApolloRequestConfig = {}) {
        const { cluster_name = this.cluster_name, namespace_name = this.namespace_name, release_key = this.release_key, ip = this.ip } = config;

        const url = `${this.config_server_url}/configfiles/json/${this.app_id}/${cluster_name}/${namespace_name}`;
        const data = {
            releaseKey: release_key,
            ip,
        };

        const response = await request(url, { data });
        if (response.data) {
            this.setEnv(response.data);
        }
        return response.data;
    }

    async remoteConfigServiceSkipCache(config: IApolloRequestConfig = {}) {
        const { cluster_name = this.cluster_name, namespace_name = this.namespace_name, release_key = this.release_key, ip = this.ip } = config;

        const url = `${this.config_server_url}/configs/${this.app_id}/${cluster_name}/${namespace_name}`;
        const data = {
            releaseKey: release_key,
            ip,
        };

        const response = await request(url, { data });
        if (response.data) {
            this.setEnv(response.data);
        }
        return response.data;
    }

    get(key: string) {
        const configs = this.configs;
        let [ namespace, ...realKeyArr ] = key.split('.');

        if (!realKeyArr.length) {
            namespace = 'application';
            realKeyArr = [ key ];
        }

        const config = configs[namespace];
        const realKey = realKeyArr.join('.');

        if (config) {
            if (config.get(realKey)) {
                return config.get(realKey);
            }
        }

        return process.env[realKey];
    }

    private setEnv(data: AppolloReponseConfigData) {
        const { configurations, releaseKey, namespaceName } = data;

        this.setConfig('release_key', releaseKey);
        let config = this.configs[namespaceName];

        if (!config) {
            config = new Map();
        }

        for (const key in configurations) {
            const configuration = configurations[key];
            process.env[`${namespaceName}.${key}`] = configuration;
            config.set(key, configuration);
        }

        if (this.set_env_file) {
            this.saveEnvFile(data);
        }

        this.configs[namespaceName] = config;

    }

    protected saveEnvFile(data: AppolloReponseConfigData) {
        const { configurations, namespaceName, releaseKey } = data;

        this.apollo_env['release_key'] = releaseKey;
        for (const key in configurations) {
            this.apollo_env[`${namespaceName}.${key}`] = configurations[key];
        }

        let fileData = '';
        for (const key in this.apollo_env) {
            fileData += `${key}=${this.apollo_env[key]}\n`;
        }

        fs.writeFileSync(this.env_file_path, fileData, 'utf-8');
    }

    protected readFromEnvFile(envPath: string = this.env_file_path) {
        try {
            const data = fs.readFileSync(envPath, 'utf-8');
            const configs = data.split('\n');
            for (const config of configs) {
                if (config.trim()) {
                    const [ key, value ] = config.split('=');
                    this.apollo_env[key] = value;
                }
            }
        } catch (err) {
            this.app.logger.warn(`[egg-apollo-client] read env_file: ${envPath} error when apollo start`);
        }
    }

    protected checkEnvPath(envPath?: string) {
        if (!envPath) {
            envPath = path.resolve(this.app.baseDir, '.env.apollo');
        } else {
            if (path.isAbsolute(envPath)) {
                envPath = envPath.replace('/', '');
            }
            envPath = path.resolve(this.app.baseDir, envPath);

            if (fs.existsSync(envPath)) {
                try {
                    fs.readdirSync(envPath);

                    envPath = path.resolve(envPath, '.env.apollo');
                } catch (e) {
                    const errcode = e.code;
                    if (errcode !== 'ENOTDIR') {
                        envPath = path.resolve(this.app.baseDir, '.env.apollo');
                    }
                }
            } else {
                const last = envPath.split('/').pop();
                if (last && last.indexOf('.') > -1) {
                    // 如果 env path 是一个文件路径
                    const dir = envPath.replace(new RegExp(`${last}$`), '');
                    if (!fs.existsSync(dir)) {
                        //  创建前置文件夹
                        fs.mkdirSync(dir);
                    }
                } else {
                    // 如果 env path 是一个文件夹路径
                    fs.mkdirSync(envPath);
                    envPath = path.resolve(envPath, '.env.apollo');
                }
            }
        }

        if (fs.existsSync(envPath)) {
            const rename = `${envPath}.${Date.now()}`;
            fs.renameSync(envPath, rename);
        }

        return envPath;
    }
}
