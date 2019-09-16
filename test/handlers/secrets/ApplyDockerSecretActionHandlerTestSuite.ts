import { suite, test } from 'mocha-typescript';
import { ActionSnapshot, ContextUtil, TempPathsRegistry } from 'fbl';
import * as assert from 'assert';
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

import { ApplyDockerSecretActionHandler } from '../../../src/handlers';
import Container from 'typedi';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const writeFileAsync = promisify(writeFile);

@suite()
class ApplyDockerSecretActionHandlerTestSuite {
    async after(): Promise<void> {
        const api = new APIRequestProcessor();
        const secrets = await api.getAll(`/api/v1/namespaces/default/secrets`);

        for (const secret of secrets.items) {
            await api.delete(`/api/v1/namespaces/default/secrets/${secret.metadata.name}`);
        }

        Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new ApplyDockerSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        await chai.expect(actionHandler.getProcessor([], context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor(123, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor('test', context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(actionHandler.getProcessor({}, context, snapshot, {}).validate()).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        test: 'res',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;
    }

    @test()
    async passValidation(): Promise<void> {
        const actionHandler = new ApplyDockerSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    name: 'test',
                    path: 'test.json',
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async applySecretInline(): Promise<void> {
        const options = {
            name: 'test',
            inline: {
                username: 'foo',
                password: 'bar',
                email: 'foo@bar.com',
                server: 'localhost',
            },
            extra: ['--wait=true'],
        };

        const actionHandler = new ApplyDockerSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const api = new APIRequestProcessor();
        const secret = await api.get(`/api/v1/namespaces/default/secrets/${options.name}`);

        assert.strict(
            secret.data['.dockerconfigjson'],
            Buffer.from(
                JSON.stringify({
                    [options.inline.server]: {
                        username: options.inline.username,
                        password: options.inline.password,
                        email: options.inline.email,
                        auth: Buffer.from(`${options.inline.username}:${options.inline.password}`),
                    },
                }),
            ).toString('base64'),
        );
    }

    @test()
    async applySecretFromFile(): Promise<void> {
        const name = 'test';
        const tempPathRegistry = Container.get(TempPathsRegistry);
        const path = await tempPathRegistry.createTempFile(false, '.yaml');

        await writeFileAsync(path, '{}');

        const actionHandler = new ApplyDockerSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor({ name, path }, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const api = new APIRequestProcessor();
        const secret = await api.get(`/api/v1/namespaces/default/secrets/${name}`);

        assert.strict(secret.data['.dockerconfigjson'], Buffer.from('{}').toString('base64'));
    }
}
