import { suite, test } from 'mocha-typescript';
import { ActionSnapshot, ContextUtil } from 'fbl';

import { ApplyActionHandler, WaitActionHandler } from '../../src/handlers';
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class WaitHandlerTestSuite {
    @test()
    async failValidation(): Promise<void> {
        const actionHandler = new WaitActionHandler();
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
                        resource: 'res',
                    },
                    context,
                    snapshot,
                    {},
                )
                .validate(),
        ).to.be.rejected;

        await chai.expect(
            actionHandler
                .getProcessor(
                    {
                        resource: 'resource',
                        name: 'name',
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
        const actionHandler = new WaitActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        await actionHandler
            .getProcessor(
                {
                    resource: 'pod',
                    name: 'busybox',
                    for: {
                        condition: 'Ready',
                    },
                },
                context,
                snapshot,
                {},
            )
            .validate();
    }

    @test()
    async createAndDeletePod(): Promise<void> {
        const name = 'busybox1';
        await this.createBusyboxPod('busybox1');

        const actionHandler = new WaitActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        let processor = await actionHandler.getProcessor(
            {
                resource: 'pods',
                name,
                for: {
                    condition: 'Ready',
                },
                timeout: '60s',
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();

        processor = await actionHandler.getProcessor(
            {
                resource: 'pods',
                labels: {
                    app: name,
                },
                for: {
                    delete: true,
                },
                timeout: '60s',
                extra: ['--namespace', 'default'],
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await Promise.all([processor.execute(), this.deleteBusyboxPod(name)]);
    }

    private async deleteBusyboxPod(name: string): Promise<void> {
        const api = new APIRequestProcessor();
        await api.delete(`/api/v1/namespaces/default/pods/${name}`);
    }

    private async createBusyboxPod(name: string): Promise<void> {
        const pod = {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name,
                namespace: 'default',
                labels: {
                    app: name,
                },
            },
            spec: {
                containers: [
                    {
                        image: 'busybox',
                        command: ['sleep', '30'],
                        imagePullPolicy: 'IfNotPresent',
                        name: 'busybox',
                    },
                ],
                restartPolicy: 'Never',
            },
        };

        const actionHandler = new ApplyActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('index.yml', '.', {}, '', 0, {});

        const processor = actionHandler.getProcessor(
            {
                inline: [pod],
            },
            context,
            snapshot,
            {},
        );

        await processor.validate();
        await processor.execute();
    }
}
