import {
    ActionHandler,
    ActionProcessor,
    IActionHandlerMetadata,
    IContext,
    ActionSnapshot,
    IDelegatedParameters,
} from 'fbl';
import { GetAllActionProcessor } from '../processors';

export class GetAllActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'com.fireblink.fbl.plugins.k8s.kubectl.get.all',
        aliases: ['fbl.plugins.k8s.kubectl.get.all', 'k8s.kubectl.get.all', 'kubectl.get.all'],
    };

    /* istanbul ignore next */
    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return GetAllActionHandler.metadata;
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
        return new GetAllActionProcessor(options, context, snapshot, parameters);
    }
}
