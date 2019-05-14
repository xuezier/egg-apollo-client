const Configs: Map<NamespaceConfigs, {[x: string]: string}> = new Map();

export default class NamespaceConfigs {
    constructor(configs: {[x: string]: string}) {
        Configs.set(this, configs);
        for(const key in configs) {
            this[key] = configs[key];
        }
    }

    get configs() {
        return Configs.get(this) || {};
    }

    get(key: string) {
        return this.configs[key];
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

        if(!config) {
            return false;
        }
        if(config === 'false') {
            return false;
        }

        return Boolean(config);
    }

    getJSON(key: string) {
        const config = this.get(key);

        if(!config) {
            return {};
        }

        try {
            return JSON.parse(config);
        } catch(_) {
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