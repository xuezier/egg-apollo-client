import * as http from 'http';

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
    body: Buffer;
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

const curl = require('../build/Release/curllib.node').curl as (options: CurlOptions) => Response;

export default function request(options: CurlOptions): CurlResponse {
    if (!options.method) {
        options.method = CurlMethods.GET;
    }
    const response = curl(options);
    const body = response.body.toString('utf-8');

    const headers: http.IncomingHttpHeaders = {};

    for (const header of response.headers) {
        const [ key, value ] = header.split(': ');

        if (value) {
            headers[key.toLowerCase()] = value;
        }
    }

    const [ , version, , status, message ] = (response.headers[0]).match(/(\w+\/(1\.\d|2))\s(\d+)\s(.*)/) || [ '', 'HTTP/1.1', '1.1', 400, 'Bad Request' ];

    return {
        body,
        headers,
        version,
        status: Number(status),
        message,
        isJSON()  {
            return (headers['content-type'] as string || '').startsWith('application/json');
        }
    };
}
