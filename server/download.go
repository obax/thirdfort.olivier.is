package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func DownloadHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		doc, err := GetDocument(db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve document"})
			return
		}

		path := filepath.Join("uploads", doc.DiskFilename)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found on disk"})
			return
		}

		c.Header("Content-Type", doc.ContentType)
		c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, doc.Filename))
		c.File(path)
	}
}
