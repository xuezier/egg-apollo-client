import NamespaceConfigs from './namespaceConfigs';

export default class Configs {
    private _configs: {[x: string]: Map<string, string>} = {};

    get configs() {
        return this._configs;
    }

    valueOf() {
        console.log(2333);
    }

    getNamespace(namespace: string) {
        const configs = this.configs[namespace];

        const result = {} as {[x: string]: string};
        if (configs) {
            configs.forEach((value, key) => {
                result[key] = value;
            });
        }

        return new NamespaceConfigs(result);
    }

    getAll() {
        const result: {[x: string]: NamespaceConfigs} = {};
        for (const namespace in this.configs) {
            result[namespace] = this.getNamespace(namespace);
        }

        return result;
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

    getString(key: string) {
        const config = this.get(key);

        return config ? String(config) : '';
    }

    getNumber(key: string) {
        const config = this.get(key);

        return config ? Number(config) : 0;
    }

    getBoolean(key: string) {
        const config = this.get(key);

        if (!config) {
            return false;
        }
        if (config === 'false') {
            return false;
        }

        return Boolean(config);
    }

    getJSON(key: string) {
        const config = this.get(key);

        if (!config) {
            return {};
        }

        try {
            return JSON.parse(config);
        } catch (_) {
            return {};
        }
    }

    getDate(key: string) {
        const config = this.get(key);
        try {
            return new Date(config || Date.now());
        } catch (_) {
            return new Date();
        }
    }
}
