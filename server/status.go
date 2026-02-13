package main

import (
	"database/sql/driver"
	"fmt"
)

type DocumentStatus string

const (
	StatusPending  DocumentStatus = "pending"
	StatusVerified DocumentStatus = "verified"
	StatusRejected DocumentStatus = "rejected"
)

var validStatuses = map[DocumentStatus]bool{
	StatusPending:  true,
	StatusVerified: true,
	StatusRejected: true,
}

func (s *DocumentStatus) Scan(src interface{}) error {
	var str string
	switch v := src.(type) {
	case string:
		str = v
	case []byte:
		str = string(v)
	default:
		return fmt.Errorf("document status: expected string or []byte, got %T", src)
	}
	status := DocumentStatus(str)
	if !validStatuses[status] {
		return fmt.Errorf("document status: invalid value %q", str)
	}
	*s = status
	return nil
}

func (s DocumentStatus) Value() (driver.Value, error) {
	if !validStatuses[s] {
		return nil, fmt.Errorf("document status: invalid value %q", s)
	}
	return string(s), nil
}
