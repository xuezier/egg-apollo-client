import * as fs from 'fs';

declare function require(name:string);

export default function loadTs(path: string) {
    if(fs.existsSync(path) && process.env.NODE_ENV === 'development') {
        return require(path);
    } else {
        return require(path.replace(/\.ts$/, '.js'));
    }
}