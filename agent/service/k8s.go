package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type K8sClient struct {
	// Add fields as necessary for your K8s client
	Context       context.Context
	Clientset     *kubernetes.Clientset
	DynamicClient dynamic.Interface // <--- Added this to handle CRDs like HelmChart
}

func NewK8sClient() (*K8sClient, error) {
	// Initialize and return a new K8sClient

	// if client run in cluster, use in-cluster config
	// else use kubeconfig file
	var config *rest.Config
	var err error

	// 1. Determine Config (In-Cluster vs Local)
	if _, exists := os.LookupEnv("KUBERNETES_SERVICE_HOST"); exists {
		config, err = rest.InClusterConfig()
	} else {
		homeDir, _ := os.UserHomeDir()
		kubeconfigPath := filepath.Join(homeDir, ".kube", "config")
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	// 2. Initialize Standard Client
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	// 3. Initialize Dynamic Client (Required for HelmChart CRDs)
	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	return &K8sClient{
		Clientset:     clientset,
		DynamicClient: dynClient,
		Context:       context.Background(),
	}, nil
}

func (kc *K8sClient) GetClientset() *kubernetes.Clientset {
	return kc.Clientset
}

func (kc *K8sClient) GetRestConfig() (*rest.Config, error) {
	// if client run in cluster, use in-cluster config
	// else use kubeconfig file
	if _, exists := os.LookupEnv("KUBERNETES_SERVICE_HOST"); exists {
		return rest.InClusterConfig()
	}
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	kubeconfigPath := filepath.Join(homeDir, ".kube", "config")
	return clientcmd.BuildConfigFromFlags("", kubeconfigPath)
}

func (kc *K8sClient) Close() error {
	// Clean up resources if necessary
	return nil
}

func (kc *K8sClient) Ping() error {
	// Implement a simple ping to the Kubernetes API server
	_, err := kc.Clientset.ServerVersion()
	return err
}

func (kc *K8sClient) ClientInfo() (*version.Info, error) {
	versionInfo, err := kc.Clientset.ServerVersion()
	if err != nil {
		return nil, err
	}
	return versionInfo, nil
}

func (kc *K8sClient) GetPods(namespace string) (*corev1.PodList, error) {
	pods, err := kc.Clientset.CoreV1().Pods(namespace).List(kc.Context, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return pods, nil
}

func (kc *K8sClient) GetNamespaces() (*corev1.NamespaceList, error) {
	namespaces, err := kc.Clientset.CoreV1().Namespaces().List(kc.Context, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return namespaces, nil
}

func (kc *K8sClient) GetNodes() (*corev1.NodeList, error) {
	nodes, err := kc.Clientset.CoreV1().Nodes().List(kc.Context, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return nodes, nil
}

// get cluster info like used resources, total resources etc.
func (kc *K8sClient) GetClusterInfo() (map[string]string, error) {
	info := make(map[string]string)
	nodes, err := kc.GetNodes()
	if err != nil {
		return nil, err
	}
	var totalCPU, totalMemory int64
	for _, node := range nodes.Items {
		cpu := node.Status.Capacity[corev1.ResourceCPU]
		memory := node.Status.Capacity[corev1.ResourceMemory]
		totalCPU += cpu.MilliValue()
		totalMemory += memory.Value() / (1024 * 1024) // in Mi
	}
	info["totalCPU(millicores)"] = string(totalCPU)
	info["totalMemory(Mi)"] = string(totalMemory)

	// get used resources
	usedCPU, usedMemory, err := kc.GetUsedResources()
	if err != nil {
		return nil, err
	}
	info["usedCPU(millicores)"] = string(usedCPU)
	info["usedMemory(Mi)"] = string(usedMemory)
	return info, nil
}

func (kc *K8sClient) GetUsedResources() (int64, int64, error) {
	var usedCPU, usedMemory int64
	pods, err := kc.Clientset.CoreV1().Pods("").List(kc.Context, metav1.ListOptions{})
	if err != nil {
		return 0, 0, err
	}
	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
				usedCPU += cpuReq.MilliValue()
			}
			if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				usedMemory += memReq.Value() / (1024 * 1024) // in Mi
			}
		}
	}
	return usedCPU, usedMemory, nil
}

// ApplyManifest accepts a raw YAML string (containing one or multiple documents)
// and applies them to the cluster using the Dynamic Client.
func (k *K8sClient) ApplyManifest(yamlContent string) error {
	decoder := yaml.NewYAMLOrJSONDecoder(bytes.NewReader([]byte(yamlContent)), 4096)

	for {
		// 1. Decode YAML into Unstructured map
		var rawObj unstructured.Unstructured
		if err := decoder.Decode(&rawObj); err != nil {
			if err == io.EOF {
				break // End of YAML file
			}
			return fmt.Errorf("failed to decode YAML: %w", err)
		}

		// Skip empty documents
		if len(rawObj.Object) == 0 {
			continue
		}

		// 2. Get GVR (Group Version Resource) mapping
		// This tells the client "where" to send this object (e.g., /apis/helm.cattle.io/v1/namespaces/x/helmcharts)
		gvk := rawObj.GroupVersionKind()

		// Simple mapping logic (In production, use RESTMapper for 100% accuracy, but this works for standard CRDs)
		// We convert Kind "HelmChart" -> Resource "helmcharts"
		gvr := schema.GroupVersionResource{
			Group:    gvk.Group,
			Version:  gvk.Version,
			Resource: toPlural(gvk.Kind),
		}

		// 3. Prepare the Resource Interface
		var dr dynamic.ResourceInterface
		ns := rawObj.GetNamespace()
		if ns == "" {
			// Cluster-scoped resource
			dr = k.DynamicClient.Resource(gvr)
		} else {
			// Namespaced resource
			dr = k.DynamicClient.Resource(gvr).Namespace(ns)
		}

		// 4. Apply Logic (Create or Update)
		name := rawObj.GetName()
		fmt.Printf("Applying %s/%s (%s)...\n", gvk.Kind, name, ns)

		// Try to Get existing resource
		existing, err := dr.Get(k.Context, name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// CREATE
				_, err = dr.Create(k.Context, &rawObj, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("failed to create %s: %w", name, err)
				}
				fmt.Printf("Created %s\n", name)
			} else {
				return fmt.Errorf("failed to get existing %s: %w", name, err)
			}
		} else {
			// UPDATE (Optimistic Locking)
			// We must set the ResourceVersion of the new obj to match existing to allow update
			rawObj.SetResourceVersion(existing.GetResourceVersion())
			_, err = dr.Update(k.Context, &rawObj, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to update %s: %w", name, err)
			}
			fmt.Printf("Updated %s\n", name)
		}
	}
	return nil
}

// Simple helper to pluralize Kinds (HelmChart -> helmcharts)
// A real implementation would use discovery client, but this is safe for your known types.
func toPlural(kind string) string {
	switch kind {
	case "HelmChart":
		return "helmcharts"
	case "Cluster":
		return "clusters" // for CNPG
	default:
		// Fallback: simple English pluralization
		return kind + "s"
	}
}

type BootstrapConfig struct {
	EnableGarageHQ bool
	EnableCNPG     bool
}

func (k *K8sClient) BootstrapSystem(config BootstrapConfig) error {
	// 1. GarageHQ (S3) Manifest
	if config.EnableGarageHQ {
		garageYaml := `
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: garage
  namespace: kube-system
spec:
  repo: https://garage-hq.github.io/garage-helm
  chart: garage
  targetNamespace: garage-system
  createNamespace: true
  valuesContent: |-
    replication_mode: none
    db: { engine: sqlite }
    volumes:
      data: { hostPath: { path: /var/lib/garage/data, type: DirectoryOrCreate } }
`
		if err := k.ApplyManifest(garageYaml); err != nil {
			return err
		}
	}

	if config.EnableCNPG {
		// 2. CloudNativePG (DB) Operator
		cnpgYaml := `
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: cnpg
  namespace: kube-system
spec:
  repo: https://cloudnative-pg.github.io/charts
  chart: cloudnative-pg
  targetNamespace: cnpg-system
  createNamespace: true
`
		if err := k.ApplyManifest(cnpgYaml); err != nil {
			return err
		}
	}

	return nil
}
