import * as Joi from 'joi';
import { BaseActionProcessor } from './BaseActionProcessor';
import { K8sObjectJoiValidationSchema } from '../joi/K8sObjectJoiValidationSchema';
import Container from 'typedi';
import { TempPathsRegistry } from 'fbl';

export class DeleteActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        resources: Joi.array()
            .items(
                Joi.string()
                    .min(1)
                    .required(),
            )
            .min(1),

        names: Joi.array().items(
            Joi.string()
                .min(1)
                .required(),
        ),

        paths: Joi.array().items(
            Joi.string()
                .min(1)
                .required(),
        ),

        inline: Joi.array().items(K8sObjectJoiValidationSchema),

        labels: Joi.object().pattern(
            Joi.string()
                .min(1)
                .required(),
            Joi.string()
                .required()
                .min(1),
        ),

        // Delete all resources, including uninitialized ones, in the namespace of the specified resource types.
        all: Joi.boolean(),

        // Namespace
        namespace: Joi.string(),

        // enable verbose output
        debug: Joi.boolean(),

        // extra arguments to append to the command
        // refer to `kubectl apply --help` for all available options
        extra: Joi.array().items(Joi.string()),
    })
        .with('names', 'resources')
        .without('paths', 'resources')
        .without('labels', 'names')
        .or('names', 'paths', 'inline', 'labels', 'all')
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return DeleteActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        this.snapshot.log(`Deleting release ${this.options.release}`);

        const args = await this.prepareCLIArgs();
        const result = await this.execKubectlCommand(args);

        if (result.code !== 0 || this.options.debug) {
            this.snapshot.log('exit code: ' + result.code, true);

            if (result.stdout) {
                this.snapshot.log('stdout: ' + result.stdout, true);
            }

            if (result.stderr) {
                this.snapshot.log('sterr: ' + result.stderr, true);
            }
        }

        if (result.code !== 0) {
            throw new Error(`"kubectl ${args.join(' ')}" command failed.`);
        }
    }

    /**
     * Prepare CLI args
     */
    private async prepareCLIArgs(): Promise<string[]> {
        const args: string[] = ['delete']; // TODO: handle case when kubectl requests confirmation for removal

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

        this.pushWithoutValue(args, '--all', this.options.all);

        return args;
    }
}
