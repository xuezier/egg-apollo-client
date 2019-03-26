import 'egg';
import Apollo from '../app/lib/apollo';

declare module egg {
    interface Application {
        readonly apollo: Apollo;
    }
}
