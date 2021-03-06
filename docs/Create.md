# Kubectl Apply

`kubectl create` command wrapper with ability to use templetized files as sources.

**ID:** `com.fireblink.fbl.plugins.k8s.kubectl.create`

**Aliases:**

- `fbl.plugins.k8s.kubectl.create`
- `k8s.kubectl.create`
- `kubectl.create`

## Usage

```yaml
kubectl.create:
  # [optional] List of files and globs to find resource files.
  # Note: at least one of `paths` or `inline` is required, both can be presented at same time
  paths:
    - some/path/to/resource.yml
    - some/dir/**/* # Note: matching will only process files with extension: `.json`, '.yml` and `.yaml`

  # [optional] List of resource defined inline.
  inline:
    - kind: ConfigMap
      version: v1
      metadata:
        name: some.name
        namespace: nondefault
      data:
        key: value

  # [optional] Labels for resource to match.
  labels:
    key: value

  # [optional] K8s namespace.
  # Default value: default
  namespace: nondefault

  # [optional] Enable verbose output.
  debug: true

  # [optional] Extra arguments to append to the command.
  # Refer to `kubectl create --help` for all available options.
  extra:
    - dry-run
```
