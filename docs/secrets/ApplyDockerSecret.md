# Kubectl Apply Docker Registry Secret

A convinient handler to create and update private docker registry secrets.

**ID:** `com.fireblink.fbl.plugins.k8s.kubectl.apply.docker.secret`

**Aliases:**

- `fbl.plugins.k8s.kubectl.apply.docker.secret`
- `k8s.kubectl.apply.docker.secret`
- `kubectl.apply.docker.secret`

## Usage

```yaml
kubectl.apply.docker.secret:
  # [require] Name of a Secret
  name: secret-name

  # [optional] K8s namespace.
  # Default value: default
  namespace: master

  # [optional] If you have authenticated localy with (docker login) you simply can reuse configuration file
  # Note: either one of `path` or `inline` is required, both could not be presented at same time
  path: ~/.docker/config.json

  # [optional] Inline docker secret configuration
  # Note: either one of `path` or `inline` is required, both could not be presented at same time
  inline:
    # [required] Docker username
    username: foo

    # [required] Docker user password
    password: bar

    # [required] Docker user email
    email: foo@bar.com

    # [required] Docker registry server
    server: https://index.docker.io/v1/ # Docker Hub

  # [optional] Secret labels
  labels:
    key: value

  # [optional] Enable verbose output.
  debug: true

  # [optional] Extra arguments to append to the command.
  # Refer to `kubectl apply --help` for all available options.
  extra:
    - dry-run
```
