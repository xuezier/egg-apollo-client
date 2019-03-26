import {Application} from 'egg';
import Apollo from './app/lib/apollo';

export default (app: Application) => {
    app.addSingleton('apollo', () => {
        const config = app.config.apollo;
        delete config.client;
        return new Apollo(config, app);
    });
};
