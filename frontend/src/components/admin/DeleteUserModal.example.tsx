/**
 * Example usage of DeleteUserModal component
 * 
 * This shows how to integrate the delete confirmation modal
 * into your users management page
 */

import { useState } from 'react';
import { DeleteUserModal } from './DeleteUserModal';
import { Button } from '../ui/button';

// Example: In your UsersManagement component
export function UsersManagementExample() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    username: string;
    reportCount: number;
  } | null>(null);

  // Trigger delete modal
  const handleDeleteClick = (user: { id: string; username: string; reportCount: number }) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Actual delete logic
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      // Your delete API call here
      console.log('Deleting user:', userToDelete.id);
      
      // Example API call:
      // await deleteUser(userToDelete.id);
      
      // Show success toast
      console.log('User deleted successfully');
      
      // Refresh user list
      // await fetchUsers();
      
    } catch (error) {
      console.error('Failed to delete user:', error);
      // Show error toast
    }
  };

  return (
    <div>
      {/* Example: Delete button in actions menu */}
      <Button
        variant="ghost"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => handleDeleteClick({
          id: 'user-123',
          username: 'CHRISTINE17',
          reportCount: 1
        })}
      >
        Delete User
      </Button>

      {/* Delete confirmation modal */}
      {userToDelete && (
        <DeleteUserModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          username={userToDelete.username}
          reportCount={userToDelete.reportCount}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
}

/**
 * INTEGRATION STEPS:
 * 
 * 1. Import the component:
 *    import { DeleteUserModal } from '../../components/admin/DeleteUserModal';
 * 
 * 2. Add state for modal control:
 *    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 *    const [userToDelete, setUserToDelete] = useState(null);
 * 
 * 3. Add click handler to your delete button:
 *    onClick={() => {
 *      setUserToDelete({ id: user.id, username: user.username, reportCount: user.reportCount });
 *      setDeleteModalOpen(true);
 *    }}
 * 
 * 4. Add the modal component:
 *    {userToDelete && (
 *      <DeleteUserModal
 *        open={deleteModalOpen}
 *        onOpenChange={setDeleteModalOpen}
 *        username={userToDelete.username}
 *        reportCount={userToDelete.reportCount}
 *        onConfirmDelete={async () => {
 *          await yourDeleteFunction(userToDelete.id);
 *        }}
 *      />
 *    )}
 */
