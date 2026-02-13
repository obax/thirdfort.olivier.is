package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	db, err := InitDB()
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	if err := os.MkdirAll("uploads", 0o755); err != nil {
		log.Fatalf("creating uploads directory: %v", err)
	}

	router := gin.Default()

	router.GET("/", func(c *gin.Context) {
		c.String(200, "Hello World\n")
	})
	router.GET("/documents", ListHandler(db))
	router.POST("/documents", UploadHandler(db))

	log.Println("server listening on :3000")
	log.Fatal(router.Run(":3000"))
}
