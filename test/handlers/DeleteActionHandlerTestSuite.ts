import { suite, test } from 'mocha-typescript';
import { ActionSnapshot, ContextUtil, TempPathsRegistry } from 'fbl';
import * as assert from 'assert';
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

import { DeleteActionHandler } from '../../src/handlers';
import Container from 'typedi';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';
import { join } from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const writeFileAsync = promisify(writeFile);

@suite()
class DeleteActionHandlerTestSuite {
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
        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

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
        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

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
    async deleteConfigMapInline(): Promise<void> {
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.inline',
                namespace: 'default',
            },
        };

        const api = new APIRequestProcessor();
        await api.post('/api/v1/namespaces/default/configmaps', configMap);
        const configMapFromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        assert(configMapFromK8s);

        const options = {
            inline: [configMap],
            debug: true,
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async deleteConfigMapByName(): Promise<void> {
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
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async deleteAll(): Promise<void> {
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
            all: true,
            debug: true,
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async deleteConfigMapByLabel(): Promise<void> {
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
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        const configMap2FromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap2.metadata.name}`);
        assert(configMap2FromK8s);
    }

    @test()
    async deleteMultipleConfigMaps(): Promise<void> {
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
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap2.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async deleteMultipleConfigMapsFromFiles(): Promise<void> {
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
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap2.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async deleteMultipleConfigMapsFromFolder(): Promise<void> {
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
            extra: ['--force'],
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap2.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async deleteConfigMapByTemplate(): Promise<void> {
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
            paths: [templatePath],
            debug: true,
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx = {
            namespace: 'default',
        };
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        try {
            await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);
        } catch (e) {
            assert.strictEqual(e.response.statusCode, 404);

            return;
        }

        assert(false);
    }

    @test()
    async failToDeleteMissingResource(): Promise<void> {
        const options = {
            names: ['somethins.that.doesnt.exist'],
            resources: ['ConfigMap'],
            debug: true,
        };

        const actionHandler = new DeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }
}
