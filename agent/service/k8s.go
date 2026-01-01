package k8s

import (
	"context"
	"os"
	"path/filepath"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type K8sClient struct {
	// Add fields as necessary for your K8s client
	Context   context.Context
	Clientset *kubernetes.Clientset
}

func NewK8sClient() (*K8sClient, error) {
	// Initialize and return a new K8sClient

	// if client run in cluster, use in-cluster config
	// else use kubeconfig file
	if _, exists := os.LookupEnv("KUBERNETES_SERVICE_HOST"); exists {
		config, err := rest.InClusterConfig()
		if err != nil {
			return nil, err
		}
		clientset, err := kubernetes.NewForConfig(config)
		if err != nil {
			return nil, err
		}
		return &K8sClient{Clientset: clientset, Context: context.Background()}, nil
	} else {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		kubeconfigPath := filepath.Join(homeDir, ".kube", "config")
		config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
		if err != nil {
			return nil, err
		}
		clientset, err := kubernetes.NewForConfig(config)
		if err != nil {
			return nil, err
		}
		return &K8sClient{Clientset: clientset, Context: context.Background()}, nil
	}
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
