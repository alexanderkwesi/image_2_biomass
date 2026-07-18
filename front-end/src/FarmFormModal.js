// app/screens/components/FarmFormModal.js
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const COLORS = {
  primary: '#4CAF50',
  primaryLight: 'rgba(76, 175, 80, 0.1)',
  secondary: '#FF9800',
  accent: '#2196F3',
  error: '#f44336',
  background: '#f8f9fa',
  surface: '#FFFFFF',
  surfaceVariant: '#f5f5f5',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#9E9E9E',
  textLight: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#EEEEEE',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const SOIL_TYPES = ['Loam', 'Clay', 'Sandy Loam', 'Silt', 'Peat', 'Chalk', 'Sand', 'Unknown'];
const CROP_TYPES = ['Vegetables', 'Fruits', 'Grains', 'Herbs', 'Flowers', 'Mixed Crops', 'Other'];

const FarmFormModal = ({
  visible,
  farm,
  onClose,
  onSave,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  
  const [formData, setFormData] = useState({
    name: '',
    area_hectares: 0,
    primary_crop: '',
    soil_type: '',
    description: '',
    location: '',
    is_active: true,
  });

  const isEditing = !!farm;

  React.useEffect(() => {
    if (farm) {
      setFormData({
        name: farm.name || '',
        area_hectares: farm.area_hectares || 0,
        primary_crop: farm.primary_crop || '',
        soil_type: farm.soil_type || '',
        description: farm.description || '',
        location: farm.location || '',
        is_active: farm.is_active !== undefined ? farm.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        area_hectares: 0,
        primary_crop: '',
        soil_type: '',
        description: '',
        location: '',
        is_active: true,
      });
    }
  }, [farm]);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_WIDTH);
    }
  }, [visible, slideAnim]);

  const getCropIcon = (crop) => {
    switch (crop) {
      case 'Vegetables': return '🥦';
      case 'Fruits': return '🍎';
      case 'Herbs': return '🌿';
      case 'Flowers': return '🌺';
      case 'Grains': return '🌾';
      default: return '🌱';
    }
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[styles.modal, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.header}>
                <View style={styles.titleSection}>
                  <View style={styles.icon}>
                    <Text style={styles.iconText}>
                      {isEditing ? '✏️' : '➕'}
                    </Text>
                  </View>
                  <View style={styles.titleGroup}>
                    <Text style={styles.title}>
                      {isEditing ? 'Edit Garden' : 'Add New Garden'}
                    </Text>
                    <Text style={styles.subtitle}>
                      {isEditing ? 'Update your garden details' : 'Create a new garden to manage'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.formSection}>
                  <Text style={styles.label}>Garden Name <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🌿</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.name}
                      onChangeText={(text) => handleFormChange('name', text)}
                      placeholder="Enter garden name"
                      placeholderTextColor={COLORS.textDisabled}
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Area (hectares) <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>📏</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.area_hectares.toString()}
                      onChangeText={(text) => handleFormChange('area_hectares', parseFloat(text) || 0)}
                      placeholder="0.0"
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.unitLabel}>
                      <Text style={styles.unitText}>ha</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Primary Crop Type</Text>
                  <View style={styles.pickerGrid}>
                    {CROP_TYPES.map((crop) => (
                      <TouchableOpacity
                        key={crop}
                        style={[
                          styles.pickerOption,
                          formData.primary_crop === crop && styles.pickerOptionSelected
                        ]}
                        onPress={() => handleFormChange('primary_crop', crop)}
                      >
                        <Text style={[
                          styles.pickerIcon,
                          formData.primary_crop === crop && styles.pickerIconSelected
                        ]}>
                          {getCropIcon(crop)}
                        </Text>
                        <Text style={[
                          styles.pickerText,
                          formData.primary_crop === crop && styles.pickerTextSelected
                        ]}>
                          {crop}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Soil Type</Text>
                  <View style={styles.pickerGrid}>
                    {SOIL_TYPES.map((soil) => (
                      <TouchableOpacity
                        key={soil}
                        style={[
                          styles.pickerOption,
                          formData.soil_type === soil && styles.pickerOptionSelected
                        ]}
                        onPress={() => handleFormChange('soil_type', soil)}
                      >
                        <Text style={[
                          styles.pickerIcon,
                          formData.soil_type === soil && styles.pickerIconSelected
                        ]}>
                          🌍
                        </Text>
                        <Text style={[
                          styles.pickerText,
                          formData.soil_type === soil && styles.pickerTextSelected
                        ]}>
                          {soil}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Location</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>📍</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.location}
                      onChangeText={(text) => handleFormChange('location', text)}
                      placeholder="Enter garden location"
                      placeholderTextColor={COLORS.textDisabled}
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Description</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputIcon, styles.textAreaIcon]}>📝</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) => handleFormChange('description', text)}
                      placeholder="Describe your garden (optional)"
                      placeholderTextColor={COLORS.textDisabled}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelGroup}>
                      <Text style={[
                        styles.switchIcon,
                        { color: formData.is_active ? COLORS.primary : COLORS.textDisabled }
                      ]}>
                        {formData.is_active ? '✓' : '✕'}
                      </Text>
                      <View style={styles.switchTextGroup}>
                        <Text style={styles.label}>Active Status</Text>
                        <Text style={styles.switchDescription}>
                          {formData.is_active ? 'Garden is currently active' : 'Garden is currently inactive'}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={formData.is_active}
                      onValueChange={(value) => handleFormChange('is_active', value)}
                      trackColor={{ false: COLORS.divider, true: COLORS.primaryLight }}
                      thumbColor={formData.is_active ? COLORS.primary : COLORS.textDisabled}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonIcon}>✕</Text>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonIcon}>
                    {isEditing ? '✓' : '+'}
                  </Text>
                  <Text style={styles.saveButtonText}>{isEditing ? 'Update Garden' : 'Add Garden'}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  modal: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  iconText: {
    fontSize: 28,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  label: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  required: {
    color: COLORS.error,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: SPACING.lg,
    marginRight: SPACING.md,
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.textPrimary,
    paddingVertical: SPACING.lg,
    paddingRight: SPACING.lg,
    minHeight: 60,
  },
  unitLabel: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.divider,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  unitText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  textAreaIcon: {
    alignSelf: 'flex-start',
    marginTop: SPACING.lg,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    fontSize: 18,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 2,
    borderColor: COLORS.border,
    minWidth: 140,
    marginBottom: SPACING.sm,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
    color: COLORS.textSecondary,
  },
  pickerIconSelected: {
    color: COLORS.textLight,
  },
  pickerText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  pickerTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  switchLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIcon: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  switchTextGroup: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cancelButtonIcon: {
    fontSize: 22,
    color: COLORS.textSecondary,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: SPACING.sm,
  },
  saveButtonIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});

export default FarmFormModal;