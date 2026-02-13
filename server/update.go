package main

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type updateRequest struct {
	Status          DocumentStatus `json:"status" binding:"required"`
	RejectionReason *string        `json:"rejection_reason"`
}

func UpdateHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var req updateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing or invalid status field"})
			return
		}

		if req.Status != StatusVerified && req.Status != StatusRejected {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status must be verified or rejected"})
			return
		}

		if req.Status == StatusRejected {
			if req.RejectionReason == nil || *req.RejectionReason == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "rejection_reason is required when rejecting a document"})
				return
			}
		}
		if req.Status == StatusVerified {
			req.RejectionReason = nil
		}

		doc, err := UpdateDocumentStatus(db, id, req.Status, req.RejectionReason)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update document"})
			return
		}

		c.JSON(http.StatusOK, doc)
	}
}
