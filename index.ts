import { IPlugin } from 'fbl';
import {
    ApplyActionHandler,
    CreateActionHandler,
    DeleteActionHandler,
    GetAllActionHandler,
    ApplyDockerSecretActionHandler,
    GetOneActionHandler,
    WaitActionHandler,
} from './src/handlers';

const packageJson = require('../package.json');

module.exports = <IPlugin>{
    name: packageJson.name,
    description: packageJson.description,
    tags: packageJson.keywords,
    version: packageJson.version,

    requires: {
        fbl: packageJson.peerDependencies.fbl,
        plugins: {
            // pluginId: '<0.0.1'
        },
        applications: ['kubectl'],
    },

    reporters: [],

    actionHandlers: [
        new ApplyActionHandler(),
        new CreateActionHandler(),
        new ApplyDockerSecretActionHandler(),
        new DeleteActionHandler(),
        new GetAllActionHandler(),
        new GetOneActionHandler(),
        new WaitActionHandler(),
    ],

    templateUtils: [],
};
