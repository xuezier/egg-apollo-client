# EGG-APOLLO-CLIENT

## Installation
```bash
npm i @gaoding/egg-apollo-client [--save]
```

## Usage
add plugin
```js
// config/plugin.js or config/plugin.ts
exports.apollo = {
    enable: true,
    package: '@gaoding/egg-apollo-client'
}
```

add apollo plugin config
```js
// config/config.[env].js
config.apollo = {
    config_server_url: 'http[s]://xxxxxxx', // required, 配置中心服务地址
    app_id: 'xxx',                          // required, 需要加载的配置
    cluster_name: 'xxx',                    // optional, 加载配置的集群名称, default: 'default'
    namespace_name: 'xxx',                  // optional, 加载配置的命名空间, default: 'application'
    release_key: 'xxx',                     // optional, 加载配置的版本 key, default: ''
    ip: 'xxx'                               // optional
    // watch, 还没实现
}
```

在 config 目录下添加新文件 config.apollo.js
```js
// config.apollo.js
module.exports = apollo => {
    return {
        logger: {
            level: apollo.get('LOGGER_LEVEL')
        }
        ....
    }
}
```

## Tips
- ✅ 支持初始化的同步加载配置，解决远程加载配置是异步的问题
- ✅ config.apollo.js 是 apollo 的配置文件，会在所有配置加载之后覆盖原有配置

## Todo
- 🔥 支持配置订阅模式，暂时没想到已有项目的实用性，因为插件的加载是不可修改的，更新配置要让插件生效就要重启进程
- 🔥 支持多集群加载
