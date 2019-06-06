import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';

import { Application } from 'egg';
import request, { RequestError } from './request';

import curl, { CurlMethods } from '../../lib/curl';
import Configs from './configs';

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
    init_on_start?: boolean;
    timeout?: number;
}

export interface IApolloRequestConfig {
    cluster_name?: string;
    namespace_name?: string;
    release_key?: string;
    ip?: string;
    notifications?: {
        namespaceName: string;
        notificationId: number;
    }[]
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

export interface ApolloLongPollingResponseData {
    namespaceName: string;
    notificationId: number;
    messages: {
        details: {
            [x: string]: number;
        }
    };
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
    private _init_on_start = true;
    private _env_file_path = '';

    private _delay = 1000;
    private _timeout = 5000;

    private _apollo_env: { [x: string]: string } = {};
    private _configs = new Configs();
    private _notifications: {[x: string]: number} = {};

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

    get init_on_start() {
        return this._init_on_start;
    }

    get configs() {
        return this._configs;
    }

    get apollo_env() {
        return this._apollo_env;
    }

    get notifications() {
        return this._notifications;
    }

    get delay() {
        return this._delay;
    }

    get timeout() {
        return this._timeout;
    }

    /**
     * get namespace configs
     * @param namespace
     */
    getNamespace(namespace: string) {
        return this.configs.getNamespace(namespace);
    }

    /**
     * get All configs
     */
    getAll() {
        return this.configs.getAll();
    }

    /**
     * Init configs by a sync http request
     * @param config
     */
    init(config: IApolloRequestConfig = {}) {
        const { cluster_name = this.cluster_name, namespace_name = this.namespace_name } = config;

        const url = `${this.config_server_url}/configs/${this.app_id}/${cluster_name}/${namespace_name}`;
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

    async startNotification(config: IApolloRequestConfig = {}) {
        let retryTimes = 0;

        while(true) {
            try {
                const data: ApolloLongPollingResponseData[] | undefined = await this.remoteConfigFromServiceLongPolling(config);
                if(data) {
                    for(const item of data) {
                        const {notificationId, namespaceName} = item;
                        if(this.notifications[namespaceName] !== notificationId) {
                            await this.remoteConfigServiceSkipCache(config);
                            this.notifications[namespaceName] = notificationId;
                        }
                    }
                }
                retryTimes = 0;
                // 请求成功的话，重置 delay 为初始值
                this._setDelay(1000);
            } catch(err) {
                if(err instanceof RequestError && err.message === 'RequestError: request timeout') {
                    continue;
                }

                this.app.logger.warn(err);

                if(retryTimes < 10) {
                    retryTimes++;
                    await new Promise(resolve => setTimeout(resolve, this.delay));
                    // 每次重试都要加长延时时间
                    this._setDelay();
                } else {
                    this.app.logger.error('[egg-apollo-client] request notification config got error more than 10 times. stop watching');
                    break;
                }
            }
        }
    }

    async remoteConfigFromServiceLongPolling(config: IApolloRequestConfig = {}) {
        const {cluster_name = this.cluster_name, notifications = []} = config;
        if(!notifications.length) {
            notifications[0] = {
                namespaceName: 'application',
                notificationId: 0,
            }
        }

        for(const notification of notifications) {
            const {namespaceName} = notification;
            if(this.notifications[namespaceName]) {
                notification.notificationId = this.notifications[namespaceName];
            }
        }

        const url = `${this.config_server_url}/notifications/v2?appId=${this.app_id}&cluster=${cluster_name}&notifications=${encodeURI(JSON.stringify(notifications))}`;

        const response = await request(url, {
            timeout: this.timeout
        });

        return response.data;
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

    private setEnv(data: ApolloReponseConfigData) {
        let { configurations, releaseKey, namespaceName } = data;
        if(namespaceName.endsWith('.json')) {
            configurations = JSON.parse(configurations.content);
        }
        this.setConfig('release_key', releaseKey);
        let config = this.configs.configs[namespaceName];

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

        this.configs.configs[namespaceName] = config;
    }

    protected saveEnvFile(data: ApolloReponseConfigData) {
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

    private _setDelay(delay?: number) {
        if(!delay) {
            if(this.delay >= 1000000) {
                return;
            }
            delay = this.delay << 1;
        }

        this._delay = delay;
    }
}
