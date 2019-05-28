import { ActionProcessor, ChildProcessService, FSUtil, FlowService, TempPathsRegistry, ContextUtil } from 'fbl';
import Container from 'typedi';
import { safeLoad, dump } from 'js-yaml';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { createHash } from 'crypto';
import * as glob from 'glob';
import { extname, join, basename } from 'path';

const writeFileAsync = promisify(writeFile);

export abstract class BaseActionProcessor extends ActionProcessor {
    /**
     * Execute "helm" command
     * @param {string[]} args
     * @param {string} wd
     * @return {Promise<IExecOutput>}
     */
    async execKubectlCommand(
        args: string[],
        debug: boolean,
    ): Promise<{
        code: number;
        stdout: string;
        stderr: string;
    }> {
        const childProcessService = Container.get(ChildProcessService);

        const stdout: string[] = [];
        const stderr: string[] = [];

        if (debug) {
            this.snapshot.log(`Running command "kubectl ${args.join(' ')}"`);
        }

        const code = await childProcessService.exec('kubectl', args, this.snapshot.wd, {
            stdout: (chunk: any) => {
                stdout.push(chunk.toString().trim());
            },
            stderr: (chunk: any) => {
                stderr.push(chunk.toString().trim());
            },
        });

        if (code !== 0 || debug) {
            this.snapshot.log('exit code: ' + code, true);

            /* istanbul ignore else */
            if (stdout) {
                this.snapshot.log('stdout: ' + stdout, true);
            }

            /* istanbul ignore else */
            if (stderr) {
                this.snapshot.log('sterr: ' + stderr, true);
            }
        }

        if (code !== 0) {
            throw new Error(`"kubectl ${args.join(' ')}" command failed.`);
        }

        return {
            code,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n'),
        };
    }

    /**
     * Push argument with value if value exists
     */
    protected pushWithValue(args: string[], name: string, value: any): void {
        if (value !== undefined) {
            args.push(name, value.toString());
        }
    }

    /**
     * Push multiple arguments with value
     */
    protected async pushMultipleWithValue(
        args: string[],
        name: string,
        values: any[],
        transformer?: Function,
    ): Promise<void> {
        if (values) {
            for (const value of values) {
                let transformed = value;
                /* istanbul ignore else */
                if (transformer) {
                    transformed = await transformer(value);
                }
                args.push(name, transformed.toString());
            }
        }
    }

    /**
     * Push argument only if value is true
     */
    protected pushWithoutValue(args: string[], name: string, value: boolean): void {
        if (value) {
            args.push(name);
        }
    }

    /**
     * Write YAML to temp file
     * @returns temp file path
     */
    protected async writeYamlToTempFile(data: any): Promise<string> {
        const tempPathsRegistry = Container.get(TempPathsRegistry);
        const filePath = await tempPathsRegistry.createTempFile(false, '.yaml');
        await writeFileAsync(filePath, dump(data), 'utf8');

        return filePath;
    }

    private getHash(path: string): string {
        return createHash('sha256')
            .update(path, 'utf8')
            .digest('hex');
    }

    /**
     * Process glob path
     */
    protected async processGlobPath(path: string, targetDir: string): Promise<void> {
        const absolutePath = FSUtil.getAbsolutePath(path, this.snapshot.wd);
        const matches = await promisify(glob)(absolutePath);
        const dir = join(targetDir, this.getHash(absolutePath));
        await FSUtil.mkdirp(dir);

        let i = 0;
        for (const match of matches) {
            let ext = extname(match);
            ext = ext && ext.toLowerCase();
            /* istanbul ignore else */
            if (['.json', '.yml', '.yaml'].indexOf(ext) >= 0) {
                const filePath = join(dir, `${i++}_${basename(match)}`);
                await this.processTemplateFile(match, filePath);
            }
        }

        if (i === 0) {
            throw new Error(`Unable to find any json or yaml files matching: ${path}`);
        }
    }

    protected async processTemplateFile(sourcePath: string, targetPath: string): Promise<void> {
        const flowService = Container.get(FlowService);

        let fileContent: string = await FSUtil.readTextFile(FSUtil.getAbsolutePath(sourcePath, this.snapshot.wd));

        if (!fileContent) {
            throw new Error(`File is empty. ${sourcePath}`);
        }

        // resolve global template
        fileContent = await flowService.resolveTemplate(
            this.context.ejsTemplateDelimiters.global,
            fileContent,
            this.context,
            this.snapshot,
            this.parameters,
        );

        let fileContentObject = safeLoad(fileContent);

        // resolve local template
        fileContentObject = await flowService.resolveOptionsWithNoHandlerCheck(
            this.context.ejsTemplateDelimiters.local,
            fileContentObject,
            this.context,
            this.snapshot,
            this.parameters,
            false,
        );

        // resolve references
        fileContentObject = ContextUtil.resolveReferences(fileContentObject, this.context, this.parameters);

        await writeFileAsync(targetPath, dump(fileContentObject), 'utf8');
    }
}
