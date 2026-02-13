package main

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ListHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
		if page < 1 {
			page = 1
		}
		if perPage < 1 || perPage > 100 {
			perPage = 20
		}

		opts := ListOptions{
			Page:    page,
			PerPage: perPage,
			Status:  c.Query("status"),
			Query:   c.Query("q"),
		}

		result, err := ListDocuments(db, opts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}
