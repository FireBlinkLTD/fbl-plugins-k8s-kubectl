import * as Joi from 'joi';
import { BaseActionProcessor } from './BaseActionProcessor';
import { K8sObjectJoiValidationSchema } from '../joi/K8sObjectJoiValidationSchema';
import { TempPathsRegistry, FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA, ContextUtil, FSUtil } from 'fbl';
import Container from 'typedi';
import { join, basename } from 'path';

export class WaitActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        resource: Joi.string()
            .min(1)
            .required(),

        name: Joi.string()
            .min(1)
            .required(),

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
        .required()
        .options({ abortEarly: true, allowUnknown: false });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
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

        if (this.options.extra) {
            args.push(...this.options.extra);
        }

        if (this.options.for.delete) {
            args.push('--for=delete');
        }

        if (this.options.for.condition) {
            args.push(`--for=condition=${this.options.for.condition}`);
        }

        args.push(`${this.options.resource}/${this.options.name}`);

        return args;
    }
}
