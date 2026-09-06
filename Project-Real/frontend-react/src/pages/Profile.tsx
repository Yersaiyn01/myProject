import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="profile">
      <h1>Profile</h1>
      <div className="profile-info">
        <div className="info-item">
          <label>Name:</label>
          <span>{user.first_name} {user.last_name}</span>
        </div>
        <div className="info-item">
          <label>Email:</label>
          <span>{user.email}</span>
        </div>
        <div className="info-item">
          <label>Roles:</label>
          <span>{(user.roles || []).join(', ') || 'User'}</span>
        </div>
      </div>
    </div>
  );
};
