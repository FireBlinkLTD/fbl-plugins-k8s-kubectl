# Kubectl Get (All)

`kubectl get` command wrapper with ability to use templetized files as sources.

Action will return **list** (array) of resources and will fail if no resources found matching provided options.

**ID:** `com.fireblink.fbl.plugins.k8s.kubectl.get.all`

**Aliases:**

- `fbl.plugins.k8s.kubectl.get.all`
- `k8s.kubectl.get.all`
- `kubectl.get.all`

## Usage

```yaml
kubectl.get.all:
  # [optional] List of resources to remove.
  # Note: required when `names` are populated
  resources:
    - ConfigMap
    - Secret

  # [optional] List of resource names to remove.
  # Note: could not be used with `labels`.
  names:
    - some.name

  # [optional] Resources defined inline.
  inline:
    - kind: ConfigMap
      version: v1
      metadata:
        name: some.name
      namespace: nondefault
        data:
        key: value

  # [optional] Labels for resources to match.
  labels:
    app: awesome-api

  # [optional] K8s namespace.
  # Default value: default
  namespace: nondefault

  # [optional] Enable verbose output.
  debug: true

  # [optional] Extra arguments to append to the command.
  # Refer to `kubectl get --help` for all available options.
  extra:
    - '--sort-by'
    - '{.metadata.name}'

  # [optional] assign resource to context
  # follows common assign logic practices https://fbl.fireblink.com/plugins/common#assign-to
  assignResourcesTo: '$.ctx.k8s.resource'

  # [optional] push resource to context
  # follows common push logic practices https://fbl.fireblink.com/plugins/common#push-to
  pushResourcesTo:
    ctx: '$.k8s.resources'
    children: true
```
