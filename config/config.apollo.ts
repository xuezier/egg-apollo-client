import Apollo from '../app/lib/apollo';

exports = module.exports = (apollo: Apollo, appConfig: { [x: string]: any }) => {
    return {
        test: apollo.get('TEST'),
    };
};
