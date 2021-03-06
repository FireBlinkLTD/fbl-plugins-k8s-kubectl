import * as Joi from 'joi';
import { BaseActionProcessor } from './BaseActionProcessor';

export class WaitActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        resource: Joi.string().min(1).required(),

        name: Joi.string().min(1),

        labels: Joi.object().pattern(Joi.string().min(1).required(), Joi.string().required().min(1)),

        all: Joi.boolean(),

        for: Joi.object({
            delete: Joi.boolean(),
            condition: Joi.string().min(1),
        })
            .xor('delete', 'condition')
            .required()
            .options({ abortEarly: true, allowUnknown: false }),

        // enable verbose output
        debug: Joi.boolean(),

        // Namespace
        namespace: Joi.string(),

        timeout: Joi.string().min(1),

        // extra arguments to append to the command
        // refer to `kubectl wait --help` for all available options
        extra: Joi.array().items(Joi.string()),
    })
        .xor('name', 'labels', 'all')
        .required()
        .options({ abortEarly: true, allowUnknown: false });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.Schema | null {
        return WaitActionProcessor.validationSchema;
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
        const args: string[] = ['wait'];

        this.pushWithValue(args, '--namespace', this.options.namespace);
        this.pushWithValue(args, '--timeout', this.options.timeout);
        this.pushWithoutValue(args, '--all', this.options.all);

        if (this.options.extra) {
            args.push(...this.options.extra);
        }

        if (this.options.for.delete) {
            args.push('--for=delete');
        }

        if (this.options.for.condition) {
            args.push(`--for=condition=${this.options.for.condition}`);
        }

        if (this.options.labels) {
            for (const label of Object.keys(this.options.labels)) {
                const value = this.options.labels[label];
                args.push('-l', `${label}=${value}`);
            }
        }

        args.push(this.options.resource);

        if (this.options.name) {
            args.push(this.options.name);
        }

        return args;
    }
}
