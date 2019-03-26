import { ExtendContextType } from 'egg';

const APOLLO = Symbol.for('Context#Apollo');
export default {
    get apollo() {
        if (!this[APOLLO]) {
            this[APOLLO] = this.app.apollo;
        }

        return this[APOLLO];
    },
} as ExtendContextType;
