package persistence

import (
	"errors"

	"gorm.io/gorm"

	apperror "nutrimind-backend/pkg/error"
)

// wrapGormError converts GORM errors to app errors.
// Tất cả hàm wrap đều kiểm tra err == nil trước để tránh trả về lỗi
// giả khi GORM thành công (trả về nil error).
// Lỗi trước đây: *AppError được trả về dưới dạng error interface
// khiến err != nil luôn true, dù GORM đã thành công.

func wrapNotFoundError(err error, entityName string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return apperror.ErrNotFound.WithMessage("Không tìm thấy " + entityName)
	}
	return apperror.ErrInternalServerError.WithMessage("Lỗi truy vấn " + entityName).WithError(err)
}

func wrapCreateError(err error, entityName string) error {
	if err == nil {
		return nil
	}
	return apperror.ErrInternalServerError.WithMessage("Không thể tạo " + entityName).WithError(err)
}

func wrapUpdateError(err error, entityName string) error {
	if err == nil {
		return nil
	}
	return apperror.ErrInternalServerError.WithMessage("Không thể cập nhật " + entityName).WithError(err)
}

func wrapDeleteError(err error, entityName string) error {
	if err == nil {
		return nil
	}
	return apperror.ErrInternalServerError.WithMessage("Không thể xoá " + entityName).WithError(err)
}

func wrapListError(err error, entityName string) error {
	if err == nil {
		return nil
	}
	return apperror.ErrInternalServerError.WithMessage("Không thể lấy danh sách " + entityName).WithError(err)
}

func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, gorm.ErrDuplicatedKey)
}
