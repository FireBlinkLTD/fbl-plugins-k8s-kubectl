import { suite, test } from 'mocha-typescript';
import { ActionSnapshot, ContextUtil, TempPathsRegistry } from 'fbl';
import * as assert from 'assert';
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

import { ApplyActionHandler } from '../../src/handlers';
import Container from 'typedi';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { dump } from 'js-yaml';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const writeFileAsync = promisify(writeFile);

@suite()
class ApplyActionHandlerTestSuite {
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
        const actionHandler = new ApplyActionHandler();
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
        const actionHandler = new ApplyActionHandler();
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
    async applyConfigMapInline(): Promise<void> {
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

        const options = {
            inline: [configMap],
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const api = new APIRequestProcessor();
        const configMapFromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);

        assert.deepStrictEqual(configMapFromK8s.data, configMap.data);
    }

    @test()
    async applyConfigMapFromFile(): Promise<void> {
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.file',
                namespace: 'default',
                labels: {
                    app: 'test',
                },
            },
        };

        const tempPathRegistry = Container.get(TempPathsRegistry);
        const filePath = await tempPathRegistry.createTempFile(false, '.yaml');

        await writeFileAsync(filePath, dump(configMap));

        const options = {
            paths: [filePath],
            labels: {
                app: 'test',
            },
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const api = new APIRequestProcessor();
        const configMapFromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap.metadata.name}`);

        assert.deepStrictEqual(configMapFromK8s.data, configMap.data);
    }

    @test()
    async applyMultipleConfigMapsFromSingleFile(): Promise<void> {
        const configMap1 = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: 'config.map.file1',
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
                name: 'config.map.file2',
                namespace: 'default',
                labels: {
                    app: 'test',
                },
            },
        };

        const tempPathRegistry = Container.get(TempPathsRegistry);
        const filePath = await tempPathRegistry.createTempFile(false, '.yaml');

        await writeFileAsync(filePath, ['---', dump(configMap1), '---', dump(configMap2)].join('\n'));

        const options = {
            paths: [filePath],
            labels: {
                app: 'test',
            },
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const api = new APIRequestProcessor();
        const configMap1FromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap1.metadata.name}`);
        assert.deepStrictEqual(configMap1FromK8s.data, configMap1.data);

        const configMap2FromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${configMap2.metadata.name}`);
        assert.deepStrictEqual(configMap2FromK8s.data, configMap2.data);
    }

    @test()
    async applyConfigMapFromTemplate(): Promise<void> {
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            data: {
                test: 'yes',
            },
            metadata: {
                name: '<%- ctx.name %>',
                namespace: 'default',
                labels: {
                    app: 'test',
                },
            },
        };

        const tempPathRegistry = Container.get(TempPathsRegistry);
        const filePath = await tempPathRegistry.createTempFile(false, '.yaml');

        await writeFileAsync(filePath, dump(configMap));

        const options = {
            paths: [filePath],
            debug: true,
            namespace: 'default',
            extra: ['-l', 'app=test'],
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        context.ctx.name = 'config.map.tpl';
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await processor.execute();

        const api = new APIRequestProcessor();
        const configMapFromK8s = await api.get(`/api/v1/namespaces/default/configmaps/${context.ctx.name}`);

        assert.deepStrictEqual(configMapFromK8s.data, configMap.data);
    }

    @test()
    async failForMissingFile(): Promise<void> {
        const options = {
            paths: ['/tmp/missing.yml'],
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }

    @test()
    async failForCorruptedFile(): Promise<void> {
        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
        };

        const tempPathRegistry = Container.get(TempPathsRegistry);
        const filePath = await tempPathRegistry.createTempFile(false, '.yaml');

        await writeFileAsync(filePath, dump(configMap));

        const options = {
            paths: [filePath],
            labels: {
                app: 'test',
            },
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejected;
    }

    @test()
    async failForEmptyFile(): Promise<void> {
        const tempPathRegistry = Container.get(TempPathsRegistry);
        const filePath = await tempPathRegistry.createTempFile(false, '.yaml');

        const options = {
            paths: [filePath],
            labels: {
                app: 'test',
            },
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(options, context, snapshot, {});

        await processor.validate();
        await chai.expect(processor.execute()).to.be.rejectedWith(`File is empty. ${filePath}`);
    }
}
