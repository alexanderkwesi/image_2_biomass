// app/screens/components/DeleteConfirmationModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

const COLORS = {
  primary: '#4CAF50',
  error: '#f44336',
  background: '#f8f9fa',
  surface: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  overlay: 'rgba(0, 0, 0, 0.5)',
  warning: '#FFC107',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

interface DeleteConfirmationModalProps {
  visible: boolean;
  farmName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  farmName,
  onClose,
  onConfirm,
}) => {
  // Don't render if not visible
  if (!visible) return null;

  // Handle overlay click to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  // Handle modal click to prevent closing when clicking inside
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [visible, onClose]);

  return (
    <div 
      style={styles.overlay as any}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <div 
        style={styles.modal as any}
        onClick={handleModalClick}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>
          <Text style={styles.title} id="delete-modal-title">Delete Garden</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to delete "{farmName}"?
          </Text>
          <Text style={styles.warningText} id="delete-modal-description">
            This action cannot be undone. All data associated with this garden will be permanently removed.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
            aria-label="Cancel deletion"
            role="button"
          >
            <Text style={styles.buttonIcon}>✕</Text>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={onConfirm}
            aria-label={`Delete ${farmName}`}
            role="button"
          >
            <Text style={styles.buttonIcon}>🗑️</Text>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    zIndex: 9999,
    display: 'flex',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    animation: 'fadeIn 0.3s ease-out',
  },
  header: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  warningIcon: {
    fontSize: 40,
    userSelect: 'none',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    userSelect: 'none',
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
    lineHeight: 28,
    userSelect: 'none',
  },
  warningText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: SPACING.md,
    userSelect: 'none',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: SPACING.sm,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#e8e8e8',
      borderColor: '#d0d0d0',
    },
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    userSelect: 'none',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
    gap: SPACING.sm,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#d32f2f',
      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.4)',
    },
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    userSelect: 'none',
  },
  buttonIcon: {
    fontSize: 18,
    lineHeight: 22,
    userSelect: 'none',
  },
});

// Add CSS animation for modal
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
}

export default DeleteConfirmationModal;