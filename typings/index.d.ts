import 'egg';
import Apollo from '../app/lib/apollo';

declare module egg {
    type ExtendApplicationType = typeof ExtendApplication;

    interface Application {
        readonly apollo: Apollo;
    }

    interface Context {
        readonly apollo: Apollo;
    }
}
