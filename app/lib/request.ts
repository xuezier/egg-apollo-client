import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as querystring from 'querystring';

export enum RequestMethod {
    POST = 'POST',
    GET = 'GET',
    PUT = 'PUT',
    DELETE = 'DELETE',
    OPTIONS = 'OPTIONS',
    HEAD = 'HEAD',
    PATCH = 'PATCH',
    TRACE = 'TRACE',
    CONNECT = 'CONNECT',
}

export interface RequestOptions {
    header?: http.OutgoingHttpHeaders;
    headers?: http.OutgoingHttpHeaders;
    method?: RequestMethod;
    timeout?: number;
    data?: any;
}

/**
 * @description
 * @author tunan
 * @export
 * @class RequestMethodError
 * @extends {Error}
 */
export class RequestMethodError extends Error {
    /**
     * Creates an instance of RequestMethodError.
     * @author tunan
     * @memberof RequestMethodError
     */
    constructor(message?: string) {
        super(message);

        this.message = `RequestMethodError: ${message || this.message}`;
    }
}

export class UnknowReuqestError extends Error {
    constructor(message?: string) {
        super(message);
        this.message = `UnknowReuqestError: ${message || this.message}`;
    }
}

export class RequestError extends Error {
    constructor(msg?: string | Error) {
        super();
        if (typeof msg === 'object') {
            this.stack = msg.stack;
            msg = msg.message;
        }

        this.message = `RequestError: ${msg}`;
    }
}

/**
 * @description make a http request by nodejs native method
 * @param {String} uri api url
 * @param {RequestOptions} options
 */
export default function request(uri: string, options = {
    method: RequestMethod.GET,
} as RequestOptions) {
    const urlObject = new url.URL(uri);

    if (!options.method) {
        options.method = RequestMethod.GET;
    }

    if (!RequestMethod[options.method.toUpperCase()]) {
        throw new RequestMethodError(`${options.method} is not a allowed request method`);
    }

    if (options.method === RequestMethod.GET && options.data) {
        const data = options.data;
        if (typeof data === 'object') {
            urlObject.search = querystring.stringify(data);
        } else {
            urlObject.search = data;
        }
    }

    const requestOptions: http.RequestOptions = {
        protocol: urlObject.protocol,
        host: urlObject.host,
        hostname: urlObject.hostname,
        path: urlObject.pathname + urlObject.search,

        method: options.method,
        headers: options.headers || options.header,
        timeout: options.timeout || 50000,
    };

    let request: http.ClientRequest;
    let promise: Promise<http.ClientResponse & { data?: any; isJSON(): boolean; }>;

    switch (options.method) {
        case RequestMethod.GET:
        case RequestMethod.HEAD:
            promise = new Promise((resolve, reject) => {
                request = doRequest(requestOptions, resolve, reject);
                request.end();
            });
            break;
        case RequestMethod.POST:
        case RequestMethod.PATCH:
        case RequestMethod.PUT:
        case RequestMethod.DELETE:
        case RequestMethod.OPTIONS:
        case RequestMethod.TRACE:
            promise = new Promise((resolve, reject) => {
                let data = options.data;
                if (data) {
                    if (typeof data === 'object') {
                        data = Buffer.from(JSON.stringify(data));
                    } else {
                        data = Buffer.from(data);
                    }

                    if (!requestOptions.headers) {
                        requestOptions.headers = {};
                    }
                    requestOptions.headers['Content-Length'] = data.length;
                }

                request = doRequest(requestOptions, resolve, reject);

                if (data) {
                    request.write(data);
                }

                request.end();

            });
            break;
        default:
            throw new UnknowReuqestError();
    }

    return promise;
}

function doRequest(opts: http.RequestOptions, resolve: (v: any) => void, reject: (s: any) => void): http.ClientRequest {
    const protocol = opts.protocol;

    const request = (protocol === 'http:' ? http : https).request(opts, (response: http.IncomingMessage & {
        data?: any;
        isJSON?: () => boolean;
    }) => {
        let data = Buffer.from('');

        response.isJSON = function isJSON() {
            const type = response.headers['content-type'] as string || '';

            return type.startsWith('application/json');
        };

        response.on('data', chunk => {
            if (Buffer.isBuffer(chunk)) {
                data = Buffer.concat([ data, chunk ]);
            }
        });

        response.on('end', () => {
            if (data && data.length) {
                // apollo 返回的结果是 json 格式的，这里只做这个兼容
                const type = response.headers['content-type'] as string;
                if(type.startsWith('application/json')) {
                    response.data = JSON.parse(data.toString());
                } else {
                    response.data = data.toString();
                }
            }

            resolve(response);
        });

        response.on('error', error => {
            response.destroy();

            reject(error);
        });
    });

    request.on('timeout', () => {
        request.abort();
        reject(new RequestError('request timeout'));
    });

    request.on('error', error => {
        reject(new RequestError(error));
    });

    return request;
}
