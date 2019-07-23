import {
    ActionHandler,
    ActionProcessor,
    IActionHandlerMetadata,
    IContext,
    ActionSnapshot,
    IDelegatedParameters,
} from 'fbl';
import { GetOneActionProcessor } from '../processors';

export class GetOneActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.plugins.k8s.kubectl.get.one',
        aliases: ['fbl.plugins.k8s.kubectl.get.one', 'k8s.kubectl.get.one', 'kubectl.get.one'],
    };

    /* istanbul ignore next */
    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return GetOneActionHandler.metadata;
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
        return new GetOneActionProcessor(options, context, snapshot, parameters);
    }
}
