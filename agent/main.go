package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"time"

	"github.com/gorilla/websocket"

	// Import all auth plugins for broad compatibility

	"k8s-dashboard/agents/service"

	_ "k8s.io/client-go/plugin/pkg/client/auth"
)

var addr = flag.String("addr", "localhost:8080", "http service address")
var token = flag.String("token", "iamveryhandsome", "server token")

func main() {
	flag.Parse()
	log.SetFlags(0)
	// // Discover the user's home directory
	// homeDir, err := os.UserHomeDir()
	// if err != nil {
	// 	panic(err.Error())
	// }
	// kubeconfigPath := filepath.Join(homeDir, ".kube", "config")

	// // Load the kubeconfig file
	// config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	// if err != nil {
	// 	panic(err.Error())
	// }

	// // Create the clientset
	// clientset, err := kubernetes.NewForConfig(config)
	// if err != nil {
	// 	panic(err.Error())
	// }
	kubeClient, err := service.NewK8sClient()
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}
	log.Printf("Kubernetes client created: %+v", kubeClient)
	clusterConfig, err := getClusterConfig()
	if err != nil {
		log.Fatalf("Failed to get cluster config: %v", err)
	}
	log.Printf("Cluster Config: %+v", clusterConfig)
	kubeClient.BootstrapSystem(service.BootstrapConfig{
		EnableGarageHQ: clusterConfig.EnableS3Service,
		EnableCNPG:     clusterConfig.EnableDbService,
	})

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)
	u := url.URL{Scheme: "ws", Host: *addr, Path: "/api/agents/ws"}
	log.Printf("connecting to %s", u.String())

	header := make(http.Header)
	header.Add("Authorization", "Bot "+*token) // Example: Adding an auth token

	c, _, err := websocket.DefaultDialer.Dial(u.String(), header)
	if err != nil {
		log.Fatal("dial:", err)
	}
	defer c.Close()

	done := make(chan struct{})

	go func() {
		defer close(done)
		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				return
			}
			log.Printf("recv: %s", message)
		}
	}()

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return
		case t := <-ticker.C:
			err := c.WriteMessage(websocket.TextMessage, []byte(t.String()))
			if err != nil {
				log.Println("write:", err)
				return
			}
		case <-interrupt:
			log.Println("interrupt")

			// Cleanly close the connection by sending a close message and then
			// waiting (with timeout) for the server to close the connection.
			err := c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Client shutting down"))
			if err != nil {
				log.Println("write close:", err)
				return
			}
			select {
			case <-done:
			case <-time.After(time.Second):
			}
			return
		}
	}

}

type ClusterConfig struct {
	EnableS3Service bool   `json:"enableS3Service"`
	EnableDbService bool   `json:"enableDbService"`
	Name            string `json:"name"`
}

func getClusterConfig() (*ClusterConfig, error) {
	// 1. Define the data to send
	data := map[string]string{}
	jsonPayload, err := json.Marshal(data)
	if err != nil {
		log.Fatalf("Error marshalling JSON: %v", err)
	}

	// 2. Create a custom HTTP client with a timeout
	client := &http.Client{Timeout: 10 * time.Second}
	url := url.URL{
		Scheme: "https",
		Host:   *addr,
		Path:   "/api/agents/cluster-config",
	}
	// 3. Create the HTTP request object
	// The body is an io.Reader (bytes.Buffer implements this interface)
	req, err := http.NewRequest("GET", url.String(), bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Fatalf("Error creating request: %v", err)
	}

	// 4. Set necessary headers
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bot "+*token) // Example: Adding an auth token

	// 5. Send the request
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Error sending request: %v", err)
	}
	defer resp.Body.Close()

	// 6. Handle the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	fmt.Printf("Status Code: %d\n", resp.StatusCode)
	fmt.Printf("Response Body: %s\n", string(body))
	// Parse the response body into map[string]string
	var responseData ClusterConfig
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		log.Fatalf("Error unmarshalling response JSON: %v", err)
	}

	return &responseData, nil
}
