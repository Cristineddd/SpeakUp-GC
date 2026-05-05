import React, { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { UserRole, ROLE_PERMISSIONS } from "../../types/users";
import { 
  User, 
  Shield, 
  Search, 
  Gavel, 
  Heart, 
  Settings,
  UserCheck,
  UserX,
  FileText,
  Users
} from "lucide-react";
import { useNavigate } from "../../compat/router";

const RoleSelector = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  const roleIcons = {
    [UserRole.COMPLAINANT]: User,
    [UserRole.RESPONDENT]: UserX,
    [UserRole.CODI]: Search,
    [UserRole.DISCIPLINING_AUTHORITY]: Gavel,
    [UserRole.GUIDANCE_COUNSELOR]: Heart,
    [UserRole.SYSTEM_ADMIN]: Settings,
  };

  const roleDescriptions = {
    [UserRole.COMPLAINANT]: "File complaints and track case status",
    [UserRole.RESPONDENT]: "Respond to complaints filed against you",
    [UserRole.CODI]: "Investigate complaints and prepare reports",
    [UserRole.DISCIPLINING_AUTHORITY]: "Make final decisions on complaint cases",
    [UserRole.GUIDANCE_COUNSELOR]: "Provide counseling and support services",
    [UserRole.SYSTEM_ADMIN]: "Manage system settings and user accounts",
  };

  const roleDashboardPaths = {
    [UserRole.COMPLAINANT]: "/dashboard/complainant",
    [UserRole.RESPONDENT]: "/dashboard/respondent", 
    [UserRole.CODI]: "/dashboard/codi",
    [UserRole.DISCIPLINING_AUTHORITY]: "/dashboard/authority",
    [UserRole.GUIDANCE_COUNSELOR]: "/dashboard/counselor",
    [UserRole.SYSTEM_ADMIN]: "/dashboard/admin",
  };

  const handleRoleAccess = (role: UserRole) => {
    // Simulate role assignment (in real app, this would be handled by admin)
    localStorage.setItem('selectedRole', role);
    navigate(roleDashboardPaths[role]);
  };

  const getCurrentRole = () => {
    return localStorage.getItem('selectedRole') as UserRole || UserRole.COMPLAINANT;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Role Access Center</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access different user roles to test the formal complaint management system. 
            Each role has specific permissions and access to different features.
          </p>
          <div className="mt-4">
            <Badge variant="outline" className="text-sm">
              Current Role: {getCurrentRole().replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {Object.values(UserRole).map((role) => {
            const Icon = roleIcons[role];
            const permissions = ROLE_PERMISSIONS[role];
            
            return (
              <Card key={role} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {permissions.length} permissions
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {roleDescriptions[role]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Permissions:</h4>
                      <div className="space-y-1">
                        {permissions.slice(0, 3).map((permission) => (
                          <div key={permission} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span className="text-muted-foreground">
                              {permission.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          </div>
                        ))}
                        {permissions.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{permissions.length - 3} more permissions
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleRoleAccess(role)}
                      className="w-full"
                      variant={getCurrentRole() === role ? "default" : "outline"}
                    >
                      {getCurrentRole() === role ? "Current Role" : "Access Dashboard"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/complaints/new")}
                className="w-full"
              >
                File New Complaint
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/case-tracking")}
                className="w-full"
              >
                Track Cases
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/codi-investigation")}
                className="w-full"
              >
                Investigation Tools
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-sm">
              <p className="font-semibold text-yellow-800 mb-2">How to Use:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Click "Access Dashboard" on any role card to switch to that role</li>
                <li>Each role has different permissions and sees different information</li>
                <li>Your current role is saved and persists across page reloads</li>
                <li>Use this to test all features of the complaint management system</li>
                <li>In production, roles would be assigned by system administrators</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelector;
