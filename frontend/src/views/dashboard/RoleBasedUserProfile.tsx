import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { UserRole } from '../../types/users';
import { 
  User, 
  UserX, 
  Search, 
  Gavel, 
  Heart, 
  Settings,
  Building,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useNavigate } from '../../compat/router';
import { useToast } from '../../hooks/use-toast';

interface UserProfileData {
  // Basic Information
  displayName: string;
  email: string;
  contactNumber: string;
  address: string;
  
  // Role and Position
  userRole: UserRole;
  position?: string;
  department?: string;
  studentId?: string;
  employeeId?: string;
  
  // Role-specific fields
  licenseNumber?: string; // For guidance counselors
  specializations?: string[]; // For CODI members and counselors
  jurisdictions?: string[]; // For disciplining authority
  
  // Emergency Contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

const RoleBasedUserProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    displayName: '',
    email: '',
    contactNumber: '',
    address: '',
    userRole: UserRole.COMPLAINANT,
    position: '',
    department: '',
    studentId: '',
    employeeId: '',
    specializations: [],
    jurisdictions: [],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleDescriptions = {
    [UserRole.COMPLAINANT]: {
      icon: User,
      title: "Student/Staff Member",
      description: "File complaints and access support services",
      color: "text-blue-600"
    },
    [UserRole.RESPONDENT]: {
      icon: UserX,
      title: "Faculty/Staff (Respondent)",
      description: "Respond to complaints and participate in proceedings",
      color: "text-orange-600"
    },
    [UserRole.CODI]: {
      icon: Search,
      title: "CODI Member",
      description: "Committee on Decorum and Investigation",
      color: "text-purple-600"
    },
    [UserRole.DISCIPLINING_AUTHORITY]: {
      icon: Gavel,
      title: "Disciplining Authority",
      description: "Administrative decision-making role",
      color: "text-red-600"
    },
    [UserRole.GUIDANCE_COUNSELOR]: {
      icon: Heart,
      title: "Guidance Counselor",
      description: "Mental health and counseling services",
      color: "text-green-600"
    },
    [UserRole.SYSTEM_ADMIN]: {
      icon: Settings,
      title: "System Administrator",
      description: "System management and oversight",
      color: "text-gray-600"
    }
  };

  const specializationOptions = {
    [UserRole.CODI]: [
      "Sexual Harassment Investigation",
      "Academic Misconduct",
      "Workplace Harassment", 
      "Discrimination Cases",
      "General Misconduct"
    ],
    [UserRole.GUIDANCE_COUNSELOR]: [
      "Crisis Intervention",
      "Trauma Counseling",
      "Academic Stress",
      "Relationship Issues",
      "Mental Health Assessment"
    ]
  };

  const jurisdictionOptions = [
    "Departmental Level",
    "College Level", 
    "University Level",
    "System-wide Authority"
  ];

  const handleInputChange = (field: keyof UserProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact!,
        [field]: value
      }
    }));
  };

  const addSpecialization = (specialization: string) => {
    if (!profileData.specializations?.includes(specialization)) {
      setProfileData(prev => ({
        ...prev,
        specializations: [...(prev.specializations || []), specialization]
      }));
    }
  };

  const removeSpecialization = (specialization: string) => {
    setProfileData(prev => ({
      ...prev,
      specializations: prev.specializations?.filter(s => s !== specialization) || []
    }));
  };

  const validateForm = (): boolean => {
    if (!profileData.displayName || !profileData.email || !profileData.contactNumber || !profileData.address) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required basic information fields.",
        variant: "destructive"
      });
      return false;
    }

    // Role-specific validation
    if (profileData.userRole === UserRole.GUIDANCE_COUNSELOR && !profileData.licenseNumber) {
      toast({
        title: "License Number Required",
        description: "Guidance counselors must provide their license number.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Here you would save the profile data to Firestore
      // For now, we'll save to localStorage and navigate to role-specific dashboard
      
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      localStorage.setItem('selectedRole', profileData.userRole);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Profile Completed Successfully",
        description: "Your profile has been set up. Redirecting to your dashboard...",
      });
      
      // Navigate to role-specific dashboard
      const dashboardPaths = {
        [UserRole.COMPLAINANT]: "/dashboard/complainant",
        [UserRole.RESPONDENT]: "/dashboard/respondent",
        [UserRole.CODI]: "/dashboard/codi",
        [UserRole.DISCIPLINING_AUTHORITY]: "/dashboard/authority",
        [UserRole.GUIDANCE_COUNSELOR]: "/dashboard/counselor",
        [UserRole.SYSTEM_ADMIN]: "/dashboard/admin",
      };
      
      navigate(dashboardPaths[profileData.userRole]);
      
    } catch (error) {
      toast({
        title: "Profile Setup Failed",
        description: "There was an error setting up your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoleInfo = roleDescriptions[profileData.userRole];
  const SelectedIcon = selectedRoleInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">Complete Your Profile</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Complete your profile to access the SpeakUp GC communication and reporting system. 
            Your role determines your access level and available features.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Role Selection */}
          <div className="lg:col-span-1 order-1 lg:order-none">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Settings className="h-5 w-5" />
                  Select Your Role
                </CardTitle>
                <CardDescription className="text-sm">
                  Choose your role in the institution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={profileData.userRole}
                  onValueChange={(value: UserRole) => handleInputChange('userRole', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleDescriptions).map(([role, info]) => {
                      const Icon = info.icon;
                      return (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${info.color}`} />
                            <span className="text-sm md:text-base">{info.title}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {/* Selected Role Info */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <SelectedIcon className={`h-4 w-4 md:h-5 md:w-5 ${selectedRoleInfo.color}`} />
                    <span className="font-medium text-sm md:text-base">{selectedRoleInfo.title}</span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {selectedRoleInfo.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 order-2 lg:order-none">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Personal Information</CardTitle>
                <CardDescription className="text-sm">
                  Provide your basic information and role-specific details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-xs md:text-sm text-muted-foreground uppercase tracking-wide">
                    Basic Information
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayName" className="text-sm md:text-base">Full Name *</Label>
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        placeholder="Enter your full name"
                        required
                        className="text-sm md:text-base"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm md:text-base">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your.email@institution.edu"
                        required
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="contactNumber" className="text-sm md:text-base">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={profileData.contactNumber}
                      onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                      placeholder="+63 XXX XXX XXXX"
                      required
                      className="text-sm md:text-base"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address" className="text-sm md:text-base">Complete Address *</Label>
                    <Textarea
                      id="address"
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter your complete address"
                      rows={3}
                      required
                      className="text-sm md:text-base"
                    />
                  </div>
                </div>

                {/* Role-specific Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-xs md:text-sm text-muted-foreground uppercase tracking-wide">
                    Professional Information
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position" className="text-sm md:text-base">Position/Title</Label>
                      <Input
                        id="position"
                        value={profileData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        placeholder="e.g., Professor, Student, Staff"
                        className="text-sm md:text-base"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="department" className="text-sm md:text-base">Department/College</Label>
                      <Input
                        id="department"
                        value={profileData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        placeholder="e.g., Computer Science, Engineering"
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profileData.userRole === UserRole.COMPLAINANT && (
                      <div>
                        <Label htmlFor="studentId" className="text-sm md:text-base">Student ID (if applicable)</Label>
                        <Input
                          id="studentId"
                          value={profileData.studentId}
                          onChange={(e) => handleInputChange('studentId', e.target.value)}
                          placeholder="Enter student ID"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="employeeId">Employee ID (if applicable)</Label>
                      <Input
                        id="employeeId"
                        value={profileData.employeeId}
                        onChange={(e) => handleInputChange('employeeId', e.target.value)}
                        placeholder="Enter employee ID"
                      />
                    </div>
                  </div>

                  {/* Role-specific fields */}
                  {profileData.userRole === UserRole.GUIDANCE_COUNSELOR && (
                    <div>
                      <Label htmlFor="licenseNumber">Professional License Number *</Label>
                      <Input
                        id="licenseNumber"
                        value={profileData.licenseNumber}
                        onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                        placeholder="Enter your license number"
                        required
                      />
                    </div>
                  )}

                  {(profileData.userRole === UserRole.CODI || profileData.userRole === UserRole.GUIDANCE_COUNSELOR) && (
                    <div>
                      <Label>Specializations</Label>
                      <div className="space-y-2">
                        <Select onValueChange={addSpecialization}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            {specializationOptions[profileData.userRole]?.map((spec) => (
                              <SelectItem key={spec} value={spec}>
                                {spec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex flex-wrap gap-2">
                          {profileData.specializations?.map((spec) => (
                            <Badge key={spec} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialization(spec)}>
                              {spec} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {profileData.userRole === UserRole.DISCIPLINING_AUTHORITY && (
                    <div>
                      <Label htmlFor="jurisdiction">Jurisdiction Level</Label>
                      <Select onValueChange={(value) => handleInputChange('jurisdictions', [value])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select jurisdiction level" />
                        </SelectTrigger>
                        <SelectContent>
                          {jurisdictionOptions.map((jurisdiction) => (
                            <SelectItem key={jurisdiction} value={jurisdiction}>
                              {jurisdiction}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Emergency Contact
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="emergencyName">Contact Name</Label>
                      <Input
                        id="emergencyName"
                        value={profileData.emergencyContact?.name}
                        onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="emergencyRelationship">Relationship</Label>
                      <Input
                        id="emergencyRelationship"
                        value={profileData.emergencyContact?.relationship}
                        onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                        placeholder="e.g., Parent, Spouse"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="emergencyPhone">Phone Number</Label>
                      <Input
                        id="emergencyPhone"
                        value={profileData.emergencyContact?.phone}
                        onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                        placeholder="+63 XXX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                        Setting up your profile...
                      </>
                    ) : (
                      <>
                        Complete Profile Setup
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleBasedUserProfile;
