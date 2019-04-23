import * as Joi from 'joi';

export const K8sObjectJoiValidationSchema = Joi.object({
    kind: Joi.string().required(),
    apiVersion: Joi.string().required(),
    metadata: Joi.object({
        name: Joi.string().required(),
        namespace: Joi.string(),
    })
        .options({
            allowUnknown: true,
        })
        .required(),
}).options({
    allowUnknown: true,
});
