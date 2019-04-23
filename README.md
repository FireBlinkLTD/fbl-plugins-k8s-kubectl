# FBL Plugins: K8s Kubectl


TODO

[![CircleCI](https://circleci.com/gh/FireBlinkLTD/fbl-plugins-k8s-kubectl.svg?style=svg)](https://circleci.com/gh/FireBlinkLTD/fbl-plugins-k8s-kubectl)
[![Greenkeeper badge](https://badges.greenkeeper.io/FireBlinkLTD/fbl-plugins-k8s-kubectl.svg)](https://greenkeeper.io/) 
[![codecov](https://codecov.io/gh/FireBlinkLTD/fbl-plugins-k8s-kubectl/branch/master/graph/badge.svg)](https://codecov.io/gh/FireBlinkLTD/fbl-plugins-k8s-kubectl)

## Purpose

TODO

## Integration

There are multiple ways how plugin can be integrated into your flow.

### package.json

This is the most recommended way. Create `package.json` next to your flow file with following content:

```json
{
  "name": "flow-name",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "fbl": "fbl"    
  },
  "license": "UNLICENSED",
  "dependencies": {
    "@fbl-plguins/k8s-kubectl": "1.0.0",
    "fbl": "1.7.0"
  }
}
```

Then you can install dependencies as any other node module `yarn install` depending on the package manager of your choice.

After that you can use `yarn fbl <args>` to execute your flow or even register a custom script inside "scripts".

### Global installation

`npm i -g @fbl-plguins/k8s-kubectl`

### Register plugin to be accessible by fbl

- via cli: `fbl -p @fbl-plguins/k8s-kubectl <args>`
- via flow:

```yaml
requires:
  fbl: '>=1.7.0'
  plugins:
    '@fbl-plguins/k8s-kubectl': '>=1.0.0'
    
pipeline:
  # your flow goes here
```

## Action Handlers

TODO

