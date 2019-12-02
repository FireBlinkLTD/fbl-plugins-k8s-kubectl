import * as Joi from 'joi';
import { BaseActionProcessor } from '../BaseActionProcessor';
import { FSUtil } from 'fbl';

export class ApplyDockerSecretActionProcessor extends BaseActionProcessor {
    private static validationSchema = Joi.object({
        name: Joi.string()
            .min(1)
            .required(),

        path: Joi.string().min(1),

        inline: Joi.object({
            username: Joi.string()
                .required()
                .min(1),
            password: Joi.string()
                .required()
                .min(1),
            email: Joi.string()
                .required()
                .min(1),
            server: Joi.string()
                .required()
                .min(1),
        }).options({
            allowUnknown: false,
            abortEarly: true,
        }),

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
    })
        .xor('path', 'inline')
        .required()
        .options({ abortEarly: true });

    /**
     * @inheritdoc
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return ApplyDockerSecretActionProcessor.validationSchema;
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
        const args: string[] = ['apply'];

        let dockerconfigjson: string;
        if (this.options.inline) {
            const { username, password, email, server } = this.options.inline;
            dockerconfigjson = Buffer.from(
                JSON.stringify({
                    auths: {
                        [server]: {
                            username,
                            password,
                            email,
                            auth: Buffer.from(`${username}:${password}`).toString('base64'),
                        },
                    },
                }),
            ).toString('base64');
        } else {
            const path = FSUtil.getAbsolutePath(this.options.path, this.snapshot.wd);
            const fileContents = await FSUtil.readFile(path);
            dockerconfigjson = fileContents.toString('base64');
        }

        const secretFilePaht = await this.writeJsonToTempFile({
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: this.options.name,
                namespace: this.options.namespace,
                labels: this.options.labels,
            },
            data: {
                '.dockerconfigjson': dockerconfigjson,
            },
            type: 'kubernetes.io/dockerconfigjson',
        });

        args.push('-f', secretFilePaht);

        if (this.options.extra) {
            args.push(...this.options.extra);
        }

        return args;
    }
}
