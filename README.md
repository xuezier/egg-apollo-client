# EGG-APOLLO-CLIENT
[![NPM version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@gaoding/egg-apollo-client.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@gaoding/egg-apollo-client

    ******************************************************************
    ******************************************************************
    **********              代码千万行，注释第一行              **********
    **********              编码不规范，同事泪两行              **********
    ******************************************************************
    ******************************************************************

携程 Apollo 配置中心 egg 客户端版本

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
    init_on_start: true,                    // optional, 在 app 启动时同时加载配置，加载的配置会在插件加载前被加载
    cluster_name: 'xxx',                    // optional, 加载配置的集群名称, default: 'default'
    namespace_name: 'xxx',                  // optional, 加载配置的命名空间, default: 'application'
    release_key: 'xxx',                     // optional, 加载配置的版本 key, default: ''
    ip: 'xxx'                               // optional,

    set_env_file: false,                    // optional, 是否写入到 env 文件, default: false
    env_file_path: 'xxxx',                  // optional, 写入的 env 文件路径, default: ${app.baseDir}/.env.apollo
    watch: false,                           // optional, 长轮询查看配置是否更新, default: false
}
```

在 config 目录下添加新文件 config.apollo.js
```js
// config.apollo.js
module.exports = (apollo, appConfig) => {
    // 直接提取配置
    const env = apollo.get('${namespace}.NODE_ENV');
    // 不添加 namespace 前缀的时候，默认使用 application 的配置
    // 如果 application 不包含该配置，则提取 process.env 里面的配置
    // const env = apollo.get('NODE_ENV');
    // 提取类型配置
    apollo.getString('${namespace}.${string_config}');
    apollo.getNumber('${namespace}.${number_config}');
    apollo.getBoolean('${namespace}.${boolean_config}');
    apollo.getJSON('${namespace}.${json_config}');
    apollo.getDate('${namespace}.${date_config}');


    // 提取指定 namespace 内容
    const application = apollo.getNamespace('application');
    // 提取配置
    const config1 = application.get('config1');
    // 提取 string 类型配置
    const str = application.getString('config2');
    // 提取 number 类型配置
    const num = application.getNumber('config3');
    // 提取 boolean 类型配置
    const bool = application.getBoolean('config4');
    // 提取 json
    const json = application.getJSON('config5');
    // 提取 date
    const date = application.getDate('config6');

    // 提取所有配置内容
    const all = apollo.getAll();
    // 可以从 all 中提取需要的 namespace 配置
    // const application = all.application
    // const config1 = application.get('config1');
    // const str = application.getString('config2');
    // const num = application.getNumber('config3');
    // const bool = application.getBoolean('config4');
    // const json = application.getJSON('config5');
    // const date = application.getDate('config6');

    return {
        logger: {
            ...appConfig.logger,
            level: apollo.get('LOGGER_LEVEL')
        }
        ....
    }
}
```

### 启动自定义
egg-apollo-client 没有特殊配置只加载符合配置项(config.apollo)的配置信息，如果有需要其他的额外配置，可以另外通过启动自定义来配置
```js
// app.js
class AppBootHook {

  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
      // configWillLoad 是最后一次修改插件配置的时机，此方法内只能使用同步方法
      // 插件在实例化之后不能再修改配置，所以如果有需要加载插件配置的内容，需要在这里加载
      // apollo.init 结合了 http.request 的同步方法，该方法会阻塞知道拿到数据或请求超时，可以使用该方法在这里加载配置
      this.app.apollo.init({...});
  }
}
```

## Tips
- ✅ 支持初始化的同步加载配置，解决远程加载配置是异步的问题
- ✅ config.apollo.js 是 apollo 的配置文件，会在所有配置加载之后覆盖原有配置
- ✅ 支持将配置写入到本地文件，需要开启 set_env_file
- ✅ 当读取远程配置出错时，兼容本地 env 文件读取, 需要开启 set_env_file

## Todo
- ✅ 支持配置订阅模式，暂时没想到已有项目的实用性，因为插件的加载是不可修改的，更新配置要让插件生效就要重启进程
- 🔥 支持多集群加载
