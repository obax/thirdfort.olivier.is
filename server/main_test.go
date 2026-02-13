package main

import (
	"database/sql"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

func setupTestRouter(t *testing.T) (*gin.Engine, *sql.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://thirdfort:thirdfort@localhost:5432/thirdfort?sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("opening database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("pinging database: %v", err)
	}

	// Clean up test data before and after each test.
	cleanup := func() {
		db.Exec("DELETE FROM documents")
	}
	cleanup()
	t.Cleanup(func() {
		cleanup()
		db.Close()
	})

	if err := os.MkdirAll("uploads", 0o755); err != nil {
		t.Fatalf("creating uploads directory: %v", err)
	}

	router := gin.New()
	router.GET("/documents", ListHandler(db))
	router.POST("/documents", UploadHandler(db))
	router.PATCH("/documents/:id", UpdateHandler(db))
	router.GET("/documents/:id/file", DownloadHandler(db))

	return router, db
}
