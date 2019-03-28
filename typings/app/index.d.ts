// This file is created by egg-ts-helper@1.24.2
// Do not modify this file!!!!!!!!!

import 'egg';
import Apollo from '../../app/lib/apollo';
export * from 'egg';
export as namespace Egg;


declare module 'egg' {
    interface Application {
        readonly apollo: Apollo;
    }

    interface Context {
        readonly apollo: Apollo;
    }
}
