# Plastids of Pilbara app Kustomize resources

Declarative management of Plastids of Pilbara resources using Kustomize.

## How to use

Review the built resource output using `kustomize`:

```bash
kustomize build kustomize/overlays/uat/ | less
```

Run `kubectl` with the `-k` flag to generate resources for a given overlay:

```bash
kubectl --namespace plastids apply -k kustomize/overlays/uat --dry-run=client
```

## References

- <https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/>
- <https://github.com/kubernetes-sigs/kustomize>
- <https://github.com/kubernetes-sigs/kustomize/tree/master/examples>
