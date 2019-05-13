import 'egg';
import Apollo from '../app/lib/apollo';

declare module 'egg' {
    interface Application {
        apollo: Apollo;
    }

    interface Context {
        readonly apollo: Apollo;
    }
}
