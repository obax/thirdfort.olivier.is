package main

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var allowedContentTypes = map[string]string{
	"application/pdf": ".pdf",
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
}

func UploadHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		fh, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing or invalid file field"})
			return
		}

		file, err := fh.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
			return
		}
		defer file.Close()

		// Sniff content type from the first 512 bytes.
		buf := make([]byte, 512)
		n, err := file.Read(buf)
		if err != nil && err != io.EOF {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
			return
		}
		contentType := http.DetectContentType(buf[:n])

		// DetectContentType may return params (e.g. "text/plain; charset=utf-8").
		contentType = strings.SplitN(contentType, ";", 2)[0]

		ext, ok := allowedContentTypes[contentType]
		if !ok {
			c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": fmt.Sprintf("unsupported content type: %s", contentType)})
			return
		}

		// Seek back to the start so we copy the full file.
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process file"})
			return
		}

		// Write file to disk.
		diskName := uuid.New().String() + ext
		diskPath := filepath.Join("uploads", diskName)

		dst, err := os.Create(diskPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
			return
		}
		defer dst.Close()

		written, err := io.Copy(dst, file)
		if err != nil {
			os.Remove(diskPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
			return
		}

		doc := &Document{
			Filename:    fh.Filename,
			ContentType: contentType,
			FileSize:    written,
			Status:      StatusPending,
		}

		if err := InsertDocument(db, doc); err != nil {
			os.Remove(diskPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store document metadata"})
			return
		}

		c.JSON(http.StatusCreated, doc)
	}
}
