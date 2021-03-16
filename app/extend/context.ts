const APOLLO = Symbol.for('Context#Apollo');
export default {
    get apollo() {
        const that = <any>this;

        if (!that[APOLLO]) {
            that[APOLLO] = that.app.apollo;
        }

        return this[APOLLO];
    },
};
