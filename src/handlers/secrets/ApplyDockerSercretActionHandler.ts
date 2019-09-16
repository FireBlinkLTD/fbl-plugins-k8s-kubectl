import {
    ActionHandler,
    ActionProcessor,
    IActionHandlerMetadata,
    IContext,
    ActionSnapshot,
    IDelegatedParameters,
} from 'fbl';
import { ApplyDockerSecretActionProcessor } from '../../processors';

export class ApplyDockerSecretActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.plugins.k8s.kubectl.apply.docker.secret',
        aliases: [
            'fbl.plugins.k8s.kubectl.apply.docker.secret',
            'k8s.kubectl.apply.docker.secret',
            'kubectl.apply.docker.secret',
        ],
    };

    /* istanbul ignore next */
    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return ApplyDockerSecretActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    getProcessor(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): ActionProcessor {
        return new ApplyDockerSecretActionProcessor(options, context, snapshot, parameters);
    }
}
