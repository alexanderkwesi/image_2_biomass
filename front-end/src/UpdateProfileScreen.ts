// UpdateProfileScreen.tsx - React Web Version
import React, { useState, useEffect } from 'react';
import './UpdateProfileScreen.css';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface User {
  first_name: string;
  last_name: string;
  email: string;
}

interface UpdateProfileScreenProps {
  user?: User;
  onUpdateProfile?: (formData: Partial<ProfileForm>) => Promise<boolean>;
  onDeleteAccount?: () => Promise<boolean>;
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

// Icon components using Unicode characters and emojis
const BackArrowIcon = () => <span className="profile-icon">←</span>;
const MailIcon = () => <span className="profile-icon">✉️</span>;
const LockIcon = () => <span className="profile-icon">🔒</span>;
const EyeIcon = () => <span className="profile-icon">👁️</span>;
const EyeOffIcon = () => <span className="profile-icon">👁️‍🗨️</span>;
const TrashIcon = () => <span className="profile-icon">🗑️</span>;

export default function UpdateProfileScreen({ 
  user, 
  onUpdateProfile, 
  onDeleteAccount, 
  onBack,
  onNavigate 
}: UpdateProfileScreenProps) {
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Only validate passwords if any password field is filled
    if (form.currentPassword || form.newPassword || form.confirmPassword) {
      if (!form.currentPassword) {
        newErrors.currentPassword = 'Please enter your current password to make changes';
      }

      if (form.newPassword && form.newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters long';
      }

      if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
        newErrors.confirmPassword = 'New passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileForm, value: string) => {
    setForm({ ...form, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let success = false;
      
      if (onUpdateProfile) {
        // Prepare form data for update
        const updateData: Partial<ProfileForm> = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        };

        // Only include password fields if they're filled
        if (form.currentPassword) {
          updateData.currentPassword = form.currentPassword;
        }
        if (form.newPassword) {
          updateData.newPassword = form.newPassword;
        }

        success = await onUpdateProfile(updateData);
      } else {
        // Fallback to direct API call
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(`${API_BASE_URL}/update-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            currentPassword: form.currentPassword || undefined,
            newPassword: form.newPassword || undefined,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          success = true;
          alert('Success: Profile updated successfully!');
          if (onBack) onBack();
        } else {
          throw new Error(data.message || 'Failed to update profile');
        }
      }

      if (success) {
        // Clear password fields on success
        setForm({
          ...form,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      alert(`Update Failed: ${error instanceof Error ? error.message : 'Failed to update profile. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.'
    )) {
      setLoading(true);
      try {
        if (onDeleteAccount) {
          onDeleteAccount().then(success => {
            if (success && onNavigate) {
              onNavigate('login');
            }
          });
        } else {
          // Fallback to direct API call
          const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';
          const token = localStorage.getItem('auth_token');
          
          fetch(`${API_BASE_URL}/delete-account`, {
            method: 'DELETE',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
          })
          .then(response => {
            if (response.ok) {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_data');
              alert('Account Deleted: Your account has been deleted successfully.');
              if (onNavigate) onNavigate('login');
            } else {
              throw new Error('Failed to delete account');
            }
          })
          .catch(error => {
            console.error('Delete account error:', error);
            alert('Error: Failed to delete account. Please try again.');
          })
          .finally(() => {
            setLoading(false);
          });
        }
      } catch (error) {
        console.error('Delete account error:', error);
        alert('Error: Failed to delete account. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleUpdateProfile();
    }
  };

  return (
    <div className="profile-container" onKeyDown={handleKeyPress}>
      <div className="profile-content">
        {/* Header */}
        <div className="profile-header">
          {onBack && (
            <button
              className="profile-back-button"
              onClick={onBack}
              disabled={loading}
              aria-label="Go back"
            >
              <BackArrowIcon />
            </button>
          )}
          <h1 className="profile-title">Update Profile</h1>
          <p className="profile-subtitle">Manage your account details</p>
        </div>

        {/* Form */}
        <div className="profile-form">
          {/* Personal Information Section */}
          <h2 className="profile-section-title">Personal Information</h2>
          
          <div className="profile-name-row">
            <div className={`profile-input-container profile-half-input ${errors.firstName ? 'profile-input-error' : ''}`}>
              <input
                type="text"
                className="profile-input"
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={loading}
                autoCapitalize="words"
              />
              {errors.firstName && (
                <div className="profile-error-message">{errors.firstName}</div>
              )}
            </div>
            <div className={`profile-input-container profile-half-input ${errors.lastName ? 'profile-input-error' : ''}`}>
              <input
                type="text"
                className="profile-input"
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={loading}
                autoCapitalize="words"
              />
              {errors.lastName && (
                <div className="profile-error-message">{errors.lastName}</div>
              )}
            </div>
          </div>

          <div className={`profile-input-container ${errors.email ? 'profile-input-error' : ''}`}>
            <MailIcon />
            <input
              type="email"
              className="profile-input"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="email"
            />
            {errors.email && (
              <div className="profile-error-message">{errors.email}</div>
            )}
          </div>

          {/* Password Change Section */}
          <h2 className="profile-section-title">Change Password</h2>
          <p className="profile-section-subtitle">
            Leave blank if you don't want to change your password
          </p>

          <div className={`profile-input-container ${errors.currentPassword ? 'profile-input-error' : ''}`}>
            <LockIcon />
            <input
              type={showCurrentPassword ? "text" : "password"}
              className="profile-input"
              placeholder="Current Password"
              value={form.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
            />
            <button
              type="button"
              className="profile-eye-button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              disabled={loading}
              aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
            >
              {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            {errors.currentPassword && (
              <div className="profile-error-message">{errors.currentPassword}</div>
            )}
          </div>

          <div className={`profile-input-container ${errors.newPassword ? 'profile-input-error' : ''}`}>
            <LockIcon />
            <input
              type={showNewPassword ? "text" : "password"}
              className="profile-input"
              placeholder="New Password"
              value={form.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
            />
            <button
              type="button"
              className="profile-eye-button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={loading}
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
            >
              {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            {errors.newPassword && (
              <div className="profile-error-message">{errors.newPassword}</div>
            )}
          </div>

          <div className={`profile-input-container ${errors.confirmPassword ? 'profile-input-error' : ''}`}>
            <LockIcon />
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="profile-input"
              placeholder="Confirm New Password"
              value={form.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
            />
            <button
              type="button"
              className="profile-eye-button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            {errors.confirmPassword && (
              <div className="profile-error-message">{errors.confirmPassword}</div>
            )}
          </div>

          {/* Update Button */}
          <button
            type="button"
            className={`profile-update-button ${loading ? 'profile-update-button-disabled' : ''}`}
            onClick={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="profile-spinner"></div>
                <span>Updating...</span>
              </>
            ) : (
              'Update Profile'
            )}
          </button>

          {/* Danger Zone */}
          <div className="profile-danger-zone">
            <h2 className="profile-danger-zone-title">Danger Zone</h2>
            <button
              type="button"
              className="profile-delete-button"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              <TrashIcon />
              <span className="profile-delete-button-text">Delete Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}