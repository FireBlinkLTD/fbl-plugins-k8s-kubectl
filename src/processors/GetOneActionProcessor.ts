import * as Joi from 'joi';
import { BaseActionProcessor } from './BaseActionProcessor';
import { K8sObjectJoiValidationSchema } from '../joi/K8sObjectJoiValidationSchema';
import { TempPathsRegistry, FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA, ContextUtil, FSUtil } from 'fbl';
import Container from 'typedi';
import { join, basename } from 'path';

export class GetOneActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        resource: Joi.string().min(1),

        name: Joi.string().min(1),

        path: Joi.string().min(1),

        inline: K8sObjectJoiValidationSchema,

        labels: Joi.object().pattern(
            Joi.string()
                .min(1)
                .required(),
            Joi.string()
                .required()
                .min(1),
        ),

        // enable verbose output
        debug: Joi.boolean(),

        // Namespace
        namespace: Joi.string(),

        // extra arguments to append to the command
        // refer to `kubectl apply --help` for all available options
        extra: Joi.array().items(Joi.string()),

        assignResourceTo: FBL_ASSIGN_TO_SCHEMA,
        pushResourceTo: FBL_PUSH_TO_SCHEMA,
    })
        .with('name', 'resource')
        .without('path', 'resource')
        .without('labels', 'name')
        .or('resource', 'name', 'path', 'inline', 'labels')
        .required()
        .options({ abortEarly: true, allowUnknown: false });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return GetOneActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const args = await this.prepareCLIArgs();
        const result = await this.execKubectlCommand(args, this.options.debug);
        const response = JSON.parse(result.stdout);

        let items;
        if (response.kind !== 'List') {
            items = [response];
        } else {
            items = response.items;
        }

        if (!items || !items.length) {
            throw new Error('Unable to find any resources');
        }

        ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.assignResourceTo, items[0]);
        ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.pushResourceTo, items[0]);
    }

    /**
     * Prepare CLI args
     */
    private async prepareCLIArgs(): Promise<string[]> {
        const args: string[] = ['get'];

        this.pushWithValue(args, '-n', this.options.namespace);
        this.pushWithValue(args, '--chunk-size', '1');

        if (this.options.labels) {
            for (const label of Object.keys(this.options.labels)) {
                const value = this.options.labels[label];
                args.push('-l', `${label}=${value}`);
            }
        }

        if (this.options.extra) {
            args.push(...this.options.extra);
        }

        if (this.options.resource) {
            args.push(this.options.resource);
        }

        if (this.options.name) {
            args.push(this.options.name);
        }

        if (this.options.path) {
            const tempPathsRegistry = Container.get(TempPathsRegistry);
            const targetDir = await tempPathsRegistry.createTempDir();
            args.push('-R', '-f', targetDir);

            const path = FSUtil.getAbsolutePath(this.options.path, this.snapshot.wd);
            await this.processTemplateFile(path, join(targetDir, basename(path)));
        }

        if (this.options.inline) {
            const tmp = await this.writeYamlToTempFile(this.options.inline);
            args.push('-f', tmp);
        }

        this.pushWithValue(args, '-o', 'json');

        return args;
    }
}
