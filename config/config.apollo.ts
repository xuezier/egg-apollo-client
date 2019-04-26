import Apollo from "../app/lib/apollo";

exports = module.exports = (apollo: Apollo) => {
    return {
        test: apollo.get('TEST')
    }
}