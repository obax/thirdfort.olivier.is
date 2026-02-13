package main

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		docs, err := ListDocuments(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, docs)
	}
}
