# Hướng Dẫn Phát Triển Dự Án (Development Workflow)

Tài liệu này mô tả quy trình làm việc chuẩn để phát triển một tính năng mới trong dự án `go-backend-template`, đi từ việc thiết kế cơ sở dữ liệu (Database) thông qua Ent ORM, cho đến khi expose API ra bên ngoài (Routing/Handlers) và cấu hình Dependency Injection (Main).

Kiến trúc dự án áp dụng các nguyên lý của **Clean Architecture** kết hợp với **Ent ORM** cho thao tác dữ liệu.

---

## Các Bước Triển Khai Tính Năng (Ví dụ: `Product`)

Quy trình chuẩn bao gồm 6 bước chính:

1. [Định nghĩa Schema & Database (Ent Layer)](#1-định-nghĩa-schema--database-ent-layer)
2. [Định nghĩa Domain Interfaces (Domain Layer)](#2-định-nghĩa-domain-interfaces-domain-layer)
3. [Implement Repository (Infrastructure Layer)](#3-implement-repository-infrastructure-layer)
4. [Xây dựng Business Logic (Usecase Layer)](#4-xây-dựng-business-logic-usecase-layer)
5. [Tạo HTTP Handlers (Interface Layer)](#5-tạo-http-handlers-interface-layer)
6. [Đăng ký Dependency Injection & Routing (Cmd/Main Layer)](#6-đăng-ký-dependency-injection--routing-cmdmain-layer)

---

### 1. Định nghĩa Schema & Database (Ent Layer)

Bước đầu tiên là tạo entity mới trong database sử dụng `entgo.io/ent`.

**B1: Tạo Schema mới**
Sử dụng command trong Makefile để tạo khung cho schema:
```bash
make ent/new NAME=Product
```
Command này sẽ tạo file `internal/ent/schema/product.go`.

**B2: Định nghĩa Fields và Edges**
Mở file schema vừa tạo và định nghĩa các trường (fields) cùng các quan hệ (edges - ví dụ quan hệ 1-n, n-n):
```go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
)

type Product struct {
    ent.Schema
}

func (Product) Fields() []ent.Field {
    return []ent.Field{
        field.String("name").NotEmpty(),
        field.Float("price").Positive(),
        field.String("description").Optional(),
    }
}

func (Product) Edges() []ent.Edge {
    return nil // Khai báo các quan hệ ở đây nếu có
}
```

**B3: Code Generation**
Chạy command để generate mã nguồn cho Ent (các structs, builders, queries,...):
```bash
make ent/gen
```

**B4: Tạo & Chạy Migration**
Tạo file migration cho sự thay đổi database:
```bash
make migrate/diff NAME=add_product_table
```
Sau đó apply migration vào database:
```bash
make migrate/apply DB_URL="postgres://username:password@localhost:5432/go_backend_template?search_path=public&sslmode=disable"
```
*(Hãy thay đổi `DB_URL` cho đúng với cấu hình ở local của bạn)*

---

### 2. Định nghĩa Domain Interfaces (Domain Layer)

Lớp Domain chứa các interfaces mô tả các hành động tương tác với database (Repository).

Tạo file `internal/domain/repository/product_repository.go`:
```go
package repository

import (
    "context"

    "nutrimind-backend/internal/ent"
    "nutrimind-backend/pkg/query"
)

// ProductRepository kế thừa BaseRepository và định nghĩa các thao tác cụ thể
type ProductRepository interface {
    BaseRepository[ent.Product]

    // Khai báo thêm các hàm đặc thù cho Product nếu cần
    FindByName(ctx context.Context, name string) (*ent.Product, error)
    ListWithQuery(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]*ent.Product, int64, error)
}
```

---

### 3. Implement Repository (Infrastructure Layer)

Lớp Infrastructure sẽ implement các interface đã định nghĩa ở lớp Domain, sử dụng `Ent Client` để thao tác trực tiếp với Database.

Tạo file `internal/infra/persistence/product_repository_impl.go`:
```go
package persistence

import (
    "context"

    "nutrimind-backend/internal/domain/repository"
    "nutrimind-backend/internal/ent"
    "nutrimind-backend/internal/ent/product"
    "nutrimind-backend/pkg/query"
)

type productRepositoryImpl struct {
    client *ent.Client
    *BaseRepositoryImpl[ent.Product] // Tái sử dụng các thao tác CRUD cơ bản
}

// Đảm bảo struct implement interface
var _ repository.ProductRepository = (*productRepositoryImpl)(nil)

func NewProductRepository(client *ent.Client) repository.ProductRepository {
    return &productRepositoryImpl{
        client:             client,
        BaseRepositoryImpl: NewBaseRepository[ent.Product](client),
    }
}

// Implement các hàm specific
func (r *productRepositoryImpl) FindByName(ctx context.Context, name string) (*ent.Product, error) {
    p, err := r.client.Product.Query().
        Where(product.NameEQ(name)).
        First(ctx)
        
    if err != nil {
        return nil, handleError(err)
    }
    return p, nil
}

func (r *productRepositoryImpl) ListWithQuery(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]*ent.Product, int64, error) {
    // Logic query kết hợp sắp xếp, filter...
    // Tương tự form của userRepository
    return nil, 0, nil
}
```

---

### 4. Xây dựng Business Logic (Usecase Layer)

Lớp Usecase định nghĩa các interface và implementation (Logic nghiệp vụ của dự án)

**B1: Định nghĩa Service Interface & Command**
Tạo file `internal/usecase/service/product_service.go`:
```go
package service

import (
    "context"
    "nutrimind-backend/internal/ent"
    "nutrimind-backend/pkg/query"
)

type CreateProductCommand struct {
    Name        string
    Price       float64
    Description string
}

type ProductService interface {
    Create(ctx context.Context, cmd CreateProductCommand) (*ent.Product, error)
    GetByID(ctx context.Context, id int) (*ent.Product, error)
}
```

**B2: Implement Service**
Tạo file `internal/usecase/service/serviceimpl/product_service_impl.go`:
```go
package serviceimpl

import (
    "context"
    "nutrimind-backend/internal/domain/repository"
    "nutrimind-backend/internal/ent"
    "nutrimind-backend/internal/usecase/service"
)

type productServiceImpl struct {
    repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) service.ProductService {
    return &productServiceImpl{repo: repo}
}

func (s *productServiceImpl) Create(ctx context.Context, cmd service.CreateProductCommand) (*ent.Product, error) {
    // Validate business logic ở đây nếu cần...
    
    // Gọi xuống Infra layer (DB)
    return s.repo.Create(ctx, &ent.Product{
        Name:        cmd.Name,
        Price:       cmd.Price,
        Description: cmd.Description,
    })
}

func (s *productServiceImpl) GetByID(ctx context.Context, id int) (*ent.Product, error) {
    return s.repo.FindByID(ctx, id)
}
```

---

### 5. Tạo HTTP Handlers (Interface Layer)

Tầng ngoài cùng để nhận HTTP Request (phân giải parameters, validation) và trả về HTTP Response. Phụ thuộc vào Usecase Layer.

Tạo file `internal/interface/api/handler/product_handler.go`:
```go
package handler

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "nutrimind-backend/internal/usecase/service"
)

type ProductHandler struct {
    productService service.ProductService
}

func NewProductHandler(productService service.ProductService) *ProductHandler {
    return &ProductHandler{productService: productService}
}

func (h *ProductHandler) Create(c *gin.Context) {
    var req service.CreateProductCommand
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    product, err := h.productService.Create(c.Request.Context(), req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, product)
}

func (h *ProductHandler) GetByID(c *gin.Context) {
    idStr := c.Param("id")
    id, _ := strconv.Atoi(idStr) // Bỏ qua bắt lỗi cast tạm thời

    product, err := h.productService.GetByID(c.Request.Context(), id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
        return
    }

    c.JSON(http.StatusOK, product)
}
```

---

### 6. Đăng ký Dependency Injection & Routing (Cmd/Main Layer)

Cuối cùng, vào các file ở package `cmd/server/` hoặc cấu hình `router` để nối nối tất cả lại với nhau.

**B1: Setup Router** (`internal/interface/api/router/router.go`)
Đăng ký route mới vào trong Gin engine:
```go
package router

// ...các hàm khác

func SetupRouter(
    authHandler *handler.AuthHandler, 
    userHandler *handler.UserHandler, 
    productHandler *handler.ProductHandler, // Thêm handler mới
    mw *middleware.Middleware,
) *gin.Engine {
    r := gin.Default()
    
    // ... config khác
    
    api := r.Group("/api/v1")
    {
        // ... các route cũ
        
        products := api.Group("/products")
        {
            products.POST("", productHandler.Create)
            products.GET("/:id", productHandler.GetByID)
        }
    }
    
    return r
}
```

**B2: Wire Dependencies** (`cmd/server/setup.go`)
Cấu hình DI trong `setupDependencies`:
```go
// Repositories
client := database.GetClient()
// ...
productRepo := persistence.NewProductRepository(client)  // Tạo repository

// Services
// ...
productService := serviceimpl.NewProductService(productRepo) // Tạo service

// Handlers
// ...
productHandler := handler.NewProductHandler(productService) // Tạo handler

// Build router
return router.SetupRouter(authHandler, userHandler, productHandler, mw)
```

**Vậy là bạn đã hoàn tất flow tạo một nghiệp vụ mới. Bạn có thể bắt đầu server với lệnh:**
```bash
make dev
```
Hoặc:
```bash
make run
```
