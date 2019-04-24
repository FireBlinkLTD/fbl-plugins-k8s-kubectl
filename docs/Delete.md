# Kubectl Delete

`kubectl delete` command wrapper with ability to use templetized files as sources.

**ID:** `com.fireblink.fbl.plugins.k8s.kubectl.delete`
        
**Aliases:**
- `fbl.plugins.k8s.kubectl.delete`
- `k8s.kubectl.delete` 
- `kubectl.delete`

## Usage

```yaml
kubectl.delete:
  # [optional] List of resources to remove.
  # Note: required when `names` are populated
  resources: 
    - ConfigMap
    - Secret
  
  # [optional] List of resource names to remove.
  # Note: could not be used with `labels`.
  names: 
    - some.name

  # [optional] List of files or globs to find resource files (files may include EJS templates compatible with FBL).
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
        
  # [optional] Delete all resources, including uninitialized ones, in the namespace of the specified resource types.
  all: true

  # [optional] K8s namespace.
  # Default value: default
  namespace: nondefault

  # [optional] Enable verbose output.
  debug: true

  # [optional] Extra arguments to append to the command.
  # Refer to `kubectl apply --help` for all available options.
  extra: 
    - dry-run
```