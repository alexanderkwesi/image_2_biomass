// components/UserProfile.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useUserActions, UserProfile } from '../actions/userActions';
import { showSuccess, showError } from '../utils/notifications';

const UserProfileComponent: React.FC = () => {
  const dispatch = useDispatch();
  const { getUserProfile, updateUserProfile, uploadProfileAvatar } = useUserActions();
  
  const { user, loading, error } = useSelector((state: any) => ({
    user: state.user.profile,
    loading: state.user.loading,
    error: state.user.error,
  }));
  
  useEffect(() => {
    getUserProfile();
  }, [getUserProfile]);
  
  const handleSaveProfile = async (data: Partial<UserProfile>) => {
    try {
      const result = await updateUserProfile(data);
      if (result.success) {
        showSuccess('Profile updated successfully!');
      }
    } catch (error) {
      showError('Failed to update profile');
    }
  };
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showError('Image size should be less than 5MB');
      return;
    }
    
    try {
      const result = await uploadProfileAvatar(file);
      if (result.success) {
        showSuccess('Profile picture updated!');
      }
    } catch (error) {
      showError('Failed to upload profile picture');
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => getUserProfile()}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar-section">
          <img 
            src={user?.avatar || '/default-avatar.png'} 
            alt={user?.name}
            className="profile-avatar"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="avatar-upload"
          />
        </div>
        
        <div className="profile-info">
          <h1>{user?.name}</h1>
          <p>{user?.email}</p>
          <p className="role-badge">{user?.role}</p>
        </div>
      </div>
      
      <div className="profile-details">
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = Object.fromEntries(formData.entries());
          handleSaveProfile(data);
        }}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={user?.name}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={user?.email}
              disabled
            />
          </div>
          
          <button type="submit" className="save-button">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfileComponent;