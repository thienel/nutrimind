package serviceimpl

import (
	"github.com/casbin/casbin/v2"

	"nutrimind-backend/internal/usecase/service"
)

type authorizationServiceImpl struct {
	enforcer *casbin.Enforcer
}

// NewAuthorizationService creates a new authorization service wrapping a Casbin enforcer
func NewAuthorizationService(enforcer *casbin.Enforcer) service.AuthorizationService {
	return &authorizationServiceImpl{enforcer: enforcer}
}

func (s *authorizationServiceImpl) Enforce(role, path, method string) (bool, error) {
	return s.enforcer.Enforce(role, path, method)
}

// --- Policy CRUD ---

func (s *authorizationServiceImpl) GetAllPolicies() ([]service.PolicyRule, error) {
	policies, err := s.enforcer.GetPolicy()
	if err != nil {
		return nil, err
	}
	result := make([]service.PolicyRule, 0, len(policies))
	for _, p := range policies {
		if len(p) >= 3 {
			result = append(result, service.PolicyRule{
				Role:   p[0],
				Path:   p[1],
				Method: p[2],
			})
		}
	}
	return result, nil
}

func (s *authorizationServiceImpl) AddPolicy(rule service.PolicyRule) (bool, error) {
	added, err := s.enforcer.AddPolicy(rule.Role, rule.Path, rule.Method)
	if err != nil {
		return false, err
	}
	return added, nil
}

func (s *authorizationServiceImpl) RemovePolicy(rule service.PolicyRule) (bool, error) {
	removed, err := s.enforcer.RemovePolicy(rule.Role, rule.Path, rule.Method)
	if err != nil {
		return false, err
	}
	return removed, nil
}

// --- Role Hierarchy CRUD ---

func (s *authorizationServiceImpl) GetAllRoles() ([]service.RoleLink, error) {
	groupingPolicies, err := s.enforcer.GetGroupingPolicy()
	if err != nil {
		return nil, err
	}
	result := make([]service.RoleLink, 0, len(groupingPolicies))
	for _, g := range groupingPolicies {
		if len(g) >= 2 {
			result = append(result, service.RoleLink{
				Child:  g[0],
				Parent: g[1],
			})
		}
	}
	return result, nil
}

func (s *authorizationServiceImpl) AddRoleLink(child, parent string) (bool, error) {
	added, err := s.enforcer.AddGroupingPolicy(child, parent)
	if err != nil {
		return false, err
	}
	return added, nil
}

func (s *authorizationServiceImpl) RemoveRoleLink(child, parent string) (bool, error) {
	removed, err := s.enforcer.RemoveGroupingPolicy(child, parent)
	if err != nil {
		return false, err
	}
	return removed, nil
}

// --- Query ---

func (s *authorizationServiceImpl) GetPermissionsForRole(role string) ([]service.PolicyRule, error) {
	permissions, err := s.enforcer.GetPermissionsForUser(role)
	if err != nil {
		return nil, err
	}
	result := make([]service.PolicyRule, 0, len(permissions))
	for _, p := range permissions {
		if len(p) >= 3 {
			result = append(result, service.PolicyRule{
				Role:   p[0],
				Path:   p[1],
				Method: p[2],
			})
		}
	}
	return result, nil
}
