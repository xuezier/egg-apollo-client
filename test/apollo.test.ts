import mm from 'egg-mock';
import * as assert from 'assert';
import * as fs from 'fs';

describe('test/apollo.test.ts', () => {
    describe('default test for apollo', () => {
        let app;
        before(async () => {
            app = mm.app({
                baseDir: 'apps/apolloapp',
            });
            await app.ready();
        });
        after(() => app.close());
        afterEach(mm.restore);

        // test sync http request by curllib
        // it('sync http request by curllib', () => {
        //     return request(app.callback())
        //     .get('/curlTest')
        //     .expect(200)
        //     .expect(200);
        // });

        it('should get config NODE_ENV=production', () => {
            const NODE_ENV = app.config.NODE_ENV;
            return assert(NODE_ENV === 'production', `expected 'production', config got ${NODE_ENV}`);
        });

        it('should get NODE_ENV from app.apollo', () => {
            const NODE_ENV = app.apollo.get('NODE_ENV');
            return assert(NODE_ENV, `expected, NODE_ENV got ${NODE_ENV}`);
        });

        it('should get NODE_ENV from ctx.apollo', () => {
            const ctx = app.mockContext();
            const NODE_ENV = ctx.apollo.get('NODE_ENV');
            return assert(NODE_ENV, `expected, NODE_ENV got ${NODE_ENV}`);
        });
    });

    describe('test for apollo env file', () => {
        let app;
        before(async () => {
            app = mm.app({
                baseDir: 'apps/apolloapp-set-env-file',
            });
            await app.ready();
        });
        after(() => {
            app.close();
            fs.unlinkSync(app.config.apollo.env_file_path);
        });
        afterEach(mm.restore);

        it('should exists apollo env file', () => {
            const envPath = app.apollo.env_file_path;

            assert(fs.existsSync(envPath), `envPath: ${envPath} isExists expected true, but got false`);
        });
    });
});
