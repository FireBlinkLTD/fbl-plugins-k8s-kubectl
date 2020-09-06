import * as Joi from 'joi';
import { BaseActionProcessor } from './BaseActionProcessor';
import { K8sObjectJoiValidationSchema } from '../joi/K8sObjectJoiValidationSchema';
import { TempPathsRegistry } from 'fbl';
import Container from 'typedi';

export class CreateActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        paths: Joi.array().items(Joi.string().min(1)).min(1),

        inline: Joi.array().items(K8sObjectJoiValidationSchema).min(1),

        labels: Joi.object().pattern(Joi.string().min(1).required(), Joi.string().required().min(1)),

        // enable verbose output
        debug: Joi.boolean(),

        // Namespace
        namespace: Joi.string(),

        // extra arguments to append to the command
        // refer to `kubectl apply --help` for all available options
        extra: Joi.array().items(Joi.string()),
    })
        .or('paths', 'inline')
        .required()
        .options({ abortEarly: true, allowUnknown: false });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return CreateActionProcessor.validationSchema;
    }

    /**
     * @inheritdoc
     */
    async execute(): Promise<void> {
        const args = await this.prepareCLIArgs();
        await this.execKubectlCommand(args, this.options.debug);
    }

    /**
     * Prepare CLI args
     */
    private async prepareCLIArgs(): Promise<string[]> {
        const args: string[] = ['create'];

        this.pushWithValue(args, '-n', this.options.namespace);

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

        if (this.options.labels) {
            for (const label of Object.keys(this.options.labels)) {
                const value = this.options.labels[label];
                args.push('-l', `${label}=${value}`);
            }
        }

        if (this.options.extra) {
            args.push(...this.options.extra);
        }

        return args;
    }
}
