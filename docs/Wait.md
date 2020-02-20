# Kubectl Wait

`kubectl wait` command wrapper.

**ID:** `com.fireblink.fbl.plugins.k8s.kubectl.wait`

**Aliases:**

- `fbl.plugins.k8s.kubectl.wait`
- `k8s.kubectl.wait`
- `kubectl.wait`

## Usage

```yaml
kubectl.wait:
  # [required] K8s resource type name
  resource: pod

  # [optional] Resource name
  # Note: only one of "name", "labels" or "all" settings should be provided
  name: busybox1

  # [optional] Labels for resource to match.
  # Note: only one of "name", "labels" or "all" settings should be provided
  labels:
    app: awesome-api

  # [optional] Whether to match all resources.
  # Note: only one of "name", "labels" or "all" settings should be provided
  all: true

  # [required] condition
  for:
    # [optional] whether should wait for the resource to be deleted
    # Note: either "delete" or "condition" should be specified, but not both at the same time
    delete: true

    # [optional] condition to waif for
    # Note: either "delete" or "condition" should be specified, but not both at the same time
    condition: Ready

  # [optional] timeout to wait
  timeout: '60s'

  # [optional] K8s namespace.
  # Default value: default
  namespace: nondefault

  # [optional] Enable verbose output.
  debug: true

  # [optional] Extra arguments to append to the command.
  # Refer to `kubectl wait --help` for all available options.
  extra: []
```
