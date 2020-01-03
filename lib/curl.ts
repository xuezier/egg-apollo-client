import * as http from 'http';
import { spawnSync } from 'child_process';
import { stringify } from 'querystring';

export enum CurlMethods {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    OPTIONS = 'OPTIONS',
    HEAD = 'HEAD',
    PATCH = 'PATCH',
    TRACE = 'TRACE',
    CONNECT = 'CONNECT',
}

interface Response {
    headers: string[];
    body: Buffer|string;
}

export interface CurlResponse {
    body: string;
    headers: http.IncomingHttpHeaders;
    version: string;
    status: number;
    message: string;
    isJSON(): boolean;
}

export interface CurlOptions {
    method?: CurlMethods;
    url: string;
    body?: any;
    connectTimeout?: number;
    timeout?: number;
    headers?: string[];
}

const command = 'curl';

export default function request(options: CurlOptions): CurlResponse {
    if (!options.method) {
        options.method = CurlMethods.GET;
    }

    const args: Array<string|number> = [ '-i', '-X', options.method ];
    if (options.body) {
        if (typeof options.body === 'string') {
            options.body = JSON.parse(options.body);
        }

        if (options.method === CurlMethods.GET) {
            args.push('-d', stringify(options.body));
            args.push('-G');
        } else {
            args.push('-d', JSON.stringify(options.body));
        }
    }

    if (options.timeout) {
        args.push('-m', options.timeout);
    }

    if (options.connectTimeout) {
        args.push('--connect-timeout', options.connectTimeout);
    }

    if (options.headers) {
        for (const header of options.headers) {
            args.push('-H', header);
        }
    }

    args.push('-s', options.url);

    const result = spawnSync(command, args.map(String));
    const { stdout, stderr } = result;

    const [ rawHeaders, body ] = stdout.toString().split('\r\n\r\n');

    const response: Response = {
        headers: rawHeaders.split('\r\n'),
        body,
    };

    const headers: http.IncomingHttpHeaders = {};

    for (const header of response.headers) {
        const [ key, value ] = header.split(': ');

        if (value) {
            headers[key.toLowerCase()] = value;
        }
    }

    const [ , version, , status, message = '' ] = (response.headers[0]).match(/(\w+\/(\d\.\d|2))\s(\d+)\s(.*)/) || [ '', 'HTTP/1.1', '1.1', 400, 'Bad Request' ];

    return {
        body,
        headers,
        version,
        status: Number(status),
        message,
        isJSON() {
            return (headers['content-type'] as string || '').startsWith('application/json');
        },
    };
}
