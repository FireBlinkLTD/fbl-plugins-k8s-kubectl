# Kubectl Get (One)

`kubectl get` command wrapper with ability to use templetized files as sources.

Action will return only **one** resource and will fail if no resources found matching provided options.

**ID:** `com.fireblink.fbl.plugins.k8s.kubectl.get.one`

**Aliases:**

- `fbl.plugins.k8s.kubectl.get.one`
- `k8s.kubectl.get.one`
- `kubectl.get.one`

## Usage

```yaml
kubectl.get.one:
  # [optional] K8s resource type name
  resource: ConfigMap

  # [optional] Resource name
  name: app-settings

  # [optional] Resource defined inline.
  inline:
    kind: ConfigMap
    version: v1
    metadata:
      name: some.name
      namespace: nondefault
    data:
      key: value

  # [optional] Labels for resource to match.
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
  assignResourceTo: '$.ctx.k8s.resource'

  # [optional] push resource to context
  # follows common push logic practices https://fbl.fireblink.com/plugins/common#push-to
  pushResourceTo: '$.ctx.k8s.resources'
```
