import { suite, test } from 'mocha-typescript';
import { ActionSnapshot, ContextUtil, TempPathsRegistry } from 'fbl';
import * as assert from 'assert';
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

import { GetAllActionHandler } from '../../src/handlers';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';
import { join } from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const writeFileAsync = promisify(writeFile);

@suite()
class GetAllActionHandlerTestSuite {
    async after(): Promise<void> {
        const api = new APIRequestProcessor();
        const configMaps = await api.getAll(`/api/v1/namespaces/default/configmaps`);

        for (const configMap of configMaps.items) {
            await api.delete(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        }

        TempPathsRegistry.instance.cleanup();
    }

    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new GetAllActionHandler();
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
        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    paths: ['test'],
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
            inline: [configMap],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s);
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
            names: [configMap.metadata.name],
            resources: ['ConfigMap'],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s);
    }

    @test()
    async getAll(): Promise<void> {
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
            resources: ['ConfigMap'],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s);
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
            resources: ['ConfigMap'],
            labels: configMap1.metadata.labels,
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s1);
    }

    @test()
    async getMultipleConfigMaps(): Promise<void> {
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

        const configMap2 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.2',
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
            names: [configMap1.metadata.name, configMap2.metadata.name],
            resources: ['ConfigMap'],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
            extra: ['--sort-by', '{.metadata.name}'],
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s1);
        assert.deepStrictEqual(context.ctx.configMaps[1], configMapFromK8s2);
    }

    @test()
    async getMultipleConfigMapsFromFiles(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

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

        const configMap2 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.2',
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

        const templatePath1 = await tempPathsRegistry.createTempFile(false, '.yml');
        await writeFileAsync(templatePath1, dump(configMap1));

        const templatePath2 = await tempPathsRegistry.createTempFile(false, '.yml');
        await writeFileAsync(templatePath2, dump(configMap2));

        const options = {
            paths: [templatePath1, templatePath2],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
            extra: ['--sort-by', '{.metadata.name}'],
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s1);
        assert.deepStrictEqual(context.ctx.configMaps[1], configMapFromK8s2);
    }

    @test()
    async getMultipleConfigMapsFromFolder(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

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

        const configMap2 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.2',
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

        const templateDirPath = await tempPathsRegistry.createTempDir();
        await writeFileAsync(join(templateDirPath, '1.yml'), dump(configMap1));
        await writeFileAsync(join(templateDirPath, '2.yml'), dump(configMap2));

        const options = {
            paths: [templateDirPath + '/**/*'],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
            extra: ['--sort-by', '{.metadata.name}'],
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s1);
        assert.deepStrictEqual(context.ctx.configMaps[1], configMapFromK8s2);
    }

    @test()
    async getConfigMapByTemplate(): Promise<void> {
        const tempPathsRegistry = TempPathsRegistry.instance;

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
            paths: [templatePath],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
            extra: ['--sort-by', '{.metadata.name}'],
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert(snapshot.success);
        assert.deepStrictEqual(context.ctx.configMaps[0], configMapFromK8s1);
    }

    @test()
    async failToGetMissingResource(): Promise<void> {
        const options = {
            names: ['something.that.doesnt.exist'],
            resources: ['ConfigMap'],
            debug: true,
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }

    @test()
    async getEmptyListWhenNoResourcesFound(): Promise<void> {
        const options = {
            resources: ['ConfigMap'],
            debug: true,
            assignResourcesTo: '$.ctx.configMaps',
        };

        const actionHandler = new GetAllActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        assert.deepStrictEqual(context.ctx.configMaps, []);
    }
}
