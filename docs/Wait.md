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

  # [required] Resource name
  name: busybox1

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
