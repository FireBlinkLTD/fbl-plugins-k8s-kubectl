import { suite, test } from 'mocha-typescript';
import { ActionSnapshot, ContextUtil, TempPathsRegistry } from 'fbl';
import * as assert from 'assert';
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

import { GetOneActionHandler } from '../../src/handlers';
import Container from 'typedi';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const writeFileAsync = promisify(writeFile);

@suite()
class GetOneActionHandlerTestSuite {
    async after(): Promise<void> {
        const api = new APIRequestProcessor();
        const configMaps = await api.getAll(`/api/v1/namespaces/default/configmaps`);

        for (const configMap of configMaps.items) {
            await api.delete(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        }

        Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new GetOneActionHandler();
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
        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    path: 'test',
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async getConfigMapInline(): Promise<void> {
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.inline',
                namespace: 'default',
                labels: {
                    app: 'test',
                },
            },
        };

        const api = new APIRequestProcessor();
        await api.post('/api/v1/namespaces/default/configmaps', configMap);
        const configMapFromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        assert(configMapFromK8s);

        const options = {
            inline: configMap,
            debug: true,
            assignResourceTo: '$.ctx.configMap',
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMap, configMapFromK8s);
    }

    @test()
    async getConfigMapByName(): Promise<void> {
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.name',
                namespace: 'default',
            },
        };

        const api = new APIRequestProcessor();
        await api.post('/api/v1/namespaces/default/configmaps', configMap);
        const configMapFromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        assert(configMapFromK8s);

        const options = {
            name: configMap.metadata.name,
            resource: 'ConfigMap',
            debug: true,
            assignResourceTo: '$.ctx.configMap',
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMap, configMapFromK8s);
    }

    @test()
    async getConfigMapByLabel(): Promise<void> {
        const configMap1 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.with.label',
                namespace: 'default',
                labels: {
                    app: 'test',
                },
            },
        };

        const configMap2 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.without.label',
                namespace: 'default',
            },
        };

        const api = new APIRequestProcessor();
        await api.post('/api/v1/namespaces/default/configmaps', configMap1);
        await api.post('/api/v1/namespaces/default/configmaps', configMap2);

        const configMapFromK8s1 = await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        assert(configMapFromK8s1);

        const configMapFromK8s2 = await api.get(`/api/v1/namespaces/default/configmaps/${configMap2.metadata.name}`);
        assert(configMapFromK8s2);

        const options = {
            resource: 'ConfigMap',
            labels: configMap1.metadata.labels,
            debug: true,
            assignResourceTo: '$.ctx.configMap',
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMap, configMapFromK8s1);
    }

    @test()
    async getConfigMapFromFile(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const configMap1 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.1',
                namespace: 'default',
            },
        };

        const api = new APIRequestProcessor();
        await api.post('/api/v1/namespaces/default/configmaps', configMap1);

        const configMapFromK8s1 = await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        assert(configMapFromK8s1);

        const templatePath1 = await tempPathsRegistry.createTempFile(false, '.yml');
        await writeFileAsync(templatePath1, dump(configMap1));

        const options = {
            path: templatePath1,
            debug: true,
            assignResourceTo: '$.ctx.configMap',
            extra: ['--sort-by', '{.metadata.name}'],
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMap, configMapFromK8s1);
    }

    @test()
    async getConfigMapByTemplate(): Promise<void> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);

        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.tpl',
                namespace: 'default',
            },
        };

        const api = new APIRequestProcessor();
        await api.post('/api/v1/namespaces/default/configmaps', configMap);

        const configMapFromK8s1 = await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        assert(configMapFromK8s1);

        configMap.metadata.namespace = '<%- ctx.namespace %>';
        const templatePath = await tempPathsRegistry.createTempFile(false, '.yml');
        await writeFileAsync(templatePath, dump(configMap));

        const options = {
            path: templatePath,
            debug: true,
            assignResourceTo: '$.ctx.configMap',
            extra: ['--sort-by', '{.metadata.name}'],
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMap, configMapFromK8s1);
    }

    @test()
    async failToGetMissingResource(): Promise<void> {
        const options = {
            name: 'something.that.doesnt.exist',
            resource: 'ConfigMap',
            debug: true,
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }

    @test()
    async failWhenEmptyListReturns(): Promise<void> {
        const options = {
            resource: 'ConfigMap',
            debug: true,
        };

        const actionHandler = new GetOneActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }
}
