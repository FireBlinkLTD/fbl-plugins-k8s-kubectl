import * as Joi from 'joi';
import { BaseActionProcessor } from './BaseActionProcessor';
import { K8sObjectJoiValidationSchema } from '../joi/K8sObjectJoiValidationSchema';
import { TempPathsRegistry, FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA, ContextUtil, ActionError } from 'fbl';
import Container from 'typedi';

export class GetAllActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        resources: Joi.array().items(Joi.string().min(1).required()).min(1),

        names: Joi.array().items(Joi.string().min(1).required()),

        paths: Joi.array().items(Joi.string().min(1).required()),

        inline: Joi.array().items(K8sObjectJoiValidationSchema),

        labels: Joi.object().pattern(Joi.string().min(1).required(), Joi.string().required().min(1)),

        // enable verbose output
        debug: Joi.boolean(),

        // Namespace
        namespace: Joi.string(),

        // extra arguments to append to the command
        // refer to `kubectl apply --help` for all available options
        extra: Joi.array().items(Joi.string()),

        assignResourcesTo: FBL_ASSIGN_TO_SCHEMA,
        pushResourcesTo: FBL_PUSH_TO_SCHEMA,
    })
        .with('names', 'resources')
        .without('paths', 'resources')
        .without('labels', 'names')
        .or('resources', 'names', 'paths', 'inline', 'labels')
        .required()
        .options({ abortEarly: true, allowUnknown: false });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return GetAllActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const args = await this.prepareCLIArgs();
        const result = await this.execKubectlCommand(args, this.options.debug, '');
        const response = JSON.parse(result.stdout);

        let items;
        if (response.kind !== 'List') {
            items = [response];
        } else {
            items = response.items;
        }

        if (!items || !items.length) {
            items = [];
            this.snapshot.log('Unable to find any resources', true);
        }

        ContextUtil.assignTo(this.context, this.parameters, this.snapshot, this.options.assignResourcesTo, items);
        ContextUtil.pushTo(this.context, this.parameters, this.snapshot, this.options.pushResourcesTo, items);
    }

    /**
     * Prepare CLI args
     */
    private async prepareCLIArgs(): Promise<string[]> {
        const args: string[] = ['get'];

        this.pushWithValue(args, '-n', this.options.namespace);

        if (this.options.labels) {
            for (const label of Object.keys(this.options.labels)) {
                const value = this.options.labels[label];
                args.push('-l', `${label}=${value}`);
            }
        }

        if (this.options.extra) {
            args.push(...this.options.extra);
        }

        if (this.options.resources && this.options.resources.length) {
            args.push(this.options.resources.join(','));
        }

        if (this.options.names && this.options.names.length) {
            args.push(this.options.names.join(' '));
        }

        if (this.options.paths && this.options.paths.length) {
            const tempPathsRegistry = Container.get(TempPathsRegistry);
            const targetDir = await tempPathsRegistry.createTempDir();
            args.push('-R', '-f', targetDir);

            for (const path of this.options.paths) {
                await this.processGlobPath(path, targetDir);
            }
        }

        await this.pushMultipleWithValue(
            args,
            '-f',
            this.options.inline,
            async (config: string): Promise<string> => {
                return await this.writeYamlToTempFile(config);
            },
        );

        this.pushWithValue(args, '-o', 'json');

        return args;
    }
}
